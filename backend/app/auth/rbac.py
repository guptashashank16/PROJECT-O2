import json
import logging
import os
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.security import create_access_token, decode_access_token, hash_password, verify_password

logger = logging.getLogger("hybrid-quantum-medical-ai")
security_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    VIEWER = "VIEWER"
    ADMIN = "ADMIN"


# Role-Permissions Mapping
ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.ADMIN: [
        "dataset:view", "dataset:upload", "dataset:configure",
        "model:view", "model:train", "model:configure",
        "prediction:run", "explainability:view", "evidence:view",
        "experiment:view", "experiment:create", "experiment:manage",
        "users:view", "users:manage", "audit:view"
    ],
    UserRole.RESEARCHER: [
        "dataset:view", "dataset:upload", "dataset:configure",
        "model:view", "model:train", "model:configure",
        "prediction:run", "explainability:view", "evidence:view",
        "experiment:view", "experiment:create",
    ],
    UserRole.VIEWER: [
        "dataset:view", "model:view", "explainability:view", "evidence:view",
        "experiment:view",
    ]
}


class UserRecord:
    def __init__(self, username: str, email: str, hashed_password: str, role: UserRole, full_name: str = ""):
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.role = role
        self.full_name = full_name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "username": self.username,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "role": self.role.value if isinstance(self.role, UserRole) else str(self.role),
            "full_name": self.full_name,
        }


class UserStore:
    """Thread-safe persistent JSON user repository with seeded development accounts."""

    def __init__(self, storage_path: Optional[Path] = None):
        if storage_path is None:
            from app.config import settings
            storage_path = settings.ARTIFACTS_DIR / "users.json"
        self.storage_path = storage_path
        self._users: Dict[str, UserRecord] = {}
        self._load_or_seed()

    def _load_or_seed(self) -> None:
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for u in data:
                        # Handle legacy CLINICIAN role if present in existing file
                        raw_role = u.get("role", "VIEWER")
                        if raw_role == "CLINICIAN":
                            role = UserRole.RESEARCHER
                        else:
                            try:
                                role = UserRole(raw_role)
                            except ValueError:
                                role = UserRole.VIEWER

                        rec = UserRecord(
                            username=u["username"],
                            email=u.get("email", u["username"]),
                            hashed_password=u["hashed_password"],
                            role=role,
                            full_name=u.get("full_name", ""),
                        )
                        self._users[rec.username.lower()] = rec
                self._ensure_default_credentials()
                return
            except Exception as e:
                logger.warning(f"Could not load users.json, re-seeding: {e}")

        try:
            # Development seeds: default local researcher & viewer
            researcher_pass = hash_password("Researcher123!")
            viewer_pass = hash_password("Viewer123!")
            admin_pass = hash_password("Admin123!")

            seeds = [
                UserRecord("researcher", "researcher@qcare.local", researcher_pass, UserRole.RESEARCHER, "Lead QML Researcher"),
                UserRecord("viewer", "viewer@qcare.local", viewer_pass, UserRole.VIEWER, "Research Auditor"),
                UserRecord("admin", "admin@qcare.local", admin_pass, UserRole.ADMIN, "System Administrator"),
            ]

            for s in seeds:
                self._users[s.username.lower()] = s
            self._save()
        except Exception as e:
            logger.error(f"Error seeding default users: {e}")

    def _ensure_default_credentials(self) -> None:
        """Compatible migration for legacy user files so the shared demo credentials remain valid."""
        defaults = {
            "admin": {"password": "Admin123!", "email": "admin@qcare.local", "role": UserRole.ADMIN, "full_name": "System Administrator"},
            "researcher": {"password": "Researcher123!", "email": "researcher@qcare.local", "role": UserRole.RESEARCHER, "full_name": "Lead QML Researcher"},
            "viewer": {"password": "Viewer123!", "email": "viewer@qcare.local", "role": UserRole.VIEWER, "full_name": "Research Auditor"},
        }

        for username, data in defaults.items():
            record = self._users.get(username.lower())
            if record is None:
                record = UserRecord(
                    username=username,
                    email=data["email"],
                    hashed_password=hash_password(data["password"]),
                    role=data["role"],
                    full_name=data["full_name"],
                )
                self._users[username.lower()] = record
                continue

            record.email = data["email"]
            record.role = data["role"]
            record.full_name = data["full_name"]
            record.hashed_password = hash_password(data["password"])

        self._save()

    def _save(self) -> None:
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump([u.to_dict() for u in self._users.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save users.json: {e}")

    def get_user(self, identifier: str) -> Optional[UserRecord]:
        key = identifier.lower().strip()
        user = self._users.get(key)
        if user:
            return user
        for u in self._users.values():
            if u.email.lower().strip() == key:
                return u
        return None

    def add_user(self, user: UserRecord) -> UserRecord:
        self._users[user.username.lower().strip()] = user
        self._save()
        return user

    def update_role(self, username: str, new_role: UserRole) -> Optional[UserRecord]:
        u = self.get_user(username)
        if u:
            u.role = new_role
            self._save()
            return u
        return None

    def list_users(self) -> List[UserRecord]:
        return list(self._users.values())


user_store = UserStore()


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Optional[UserRecord]:
    """Dependency to retrieve current authenticated user from Bearer JWT token."""
    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    if not username:
        return None
    return user_store.get_user(username)


def require_auth(user: Optional[UserRecord] = Depends(get_current_user)) -> UserRecord:
    """Dependency enforcing that request must come from a valid logged-in user."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_permission(permission: str):
    """Dependency factory generating a permission check for endpoints with optional guest fallback."""
    def permission_checker(user: Optional[UserRecord] = Depends(get_current_user)) -> UserRecord:
        # If unauthenticated, check if VIEWER permission allows read-only operation
        if user is None:
            viewer_permissions = ROLE_PERMISSIONS.get(UserRole.VIEWER, [])
            if permission in viewer_permissions:
                # Provide guest viewer principal for research transparency
                return UserRecord("guest", "guest@qcare.local", "", UserRole.VIEWER, "Guest Researcher")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication required for '{permission}'. Please log in.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        allowed = ROLE_PERMISSIONS.get(user.role, [])
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.value}' does not have required permission '{permission}'.",
            )
        return user
    return permission_checker
