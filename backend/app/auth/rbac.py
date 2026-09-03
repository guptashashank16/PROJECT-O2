import json
import logging
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.security import create_access_token, decode_access_token, hash_password, verify_password

logger = logging.getLogger("hybrid-quantum-medical-ai")
security_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    RESEARCHER = "RESEARCHER"
    CLINICIAN = "CLINICIAN"
    VIEWER = "VIEWER"


# Role-Permissions Mapping
ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.ADMIN: [
        "dataset:view", "dataset:upload", "dataset:configure",
        "model:view", "model:train", "model:configure",
        "prediction:run", "explainability:view", "evidence:view",
        "users:view", "users:manage", "audit:view"
    ],
    UserRole.RESEARCHER: [
        "dataset:view", "dataset:upload", "dataset:configure",
        "model:view", "model:train", "model:configure",
        "prediction:run", "explainability:view", "evidence:view",
    ],
    UserRole.CLINICIAN: [
        "dataset:view", "model:view",
        "prediction:run", "explainability:view", "evidence:view",
    ],
    UserRole.VIEWER: [
        "dataset:view", "model:view", "explainability:view", "evidence:view",
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
    """Thread-safe persistent JSON user repository with seeded default admin and clinician accounts."""

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
                        rec = UserRecord(
                            username=u["username"],
                            email=u.get("email", u["username"]),
                            hashed_password=u["hashed_password"],
                            role=UserRole(u["role"]),
                            full_name=u.get("full_name", ""),
                        )
                        self._users[rec.username.lower()] = rec
                return
            except Exception as e:
                logger.warning(f"Could not load users.json, re-seeding: {e}")

        # Seed initial system users for hackathon demo
        admin_pass = hash_password("Admin@QCare2026")
        researcher_pass = hash_password("Research@QCare2026")
        clinician_pass = hash_password("Doctor@QCare2026")
        viewer_pass = hash_password("Viewer@QCare2026")

        seeds = [
            UserRecord("admin", "admin@qcare.ai", admin_pass, UserRole.ADMIN, "System Administrator"),
            UserRecord("researcher", "researcher@qcare.ai", researcher_pass, UserRole.RESEARCHER, "Lead Quantum AI Researcher"),
            UserRecord("clinician", "doctor@qcare.ai", clinician_pass, UserRole.CLINICIAN, "Dr. Sarah Lin (Cardiology)"),
            UserRecord("viewer", "viewer@qcare.ai", viewer_pass, UserRole.VIEWER, "Clinical Auditor"),
        ]

        for s in seeds:
            self._users[s.username.lower()] = s
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
        # Check by email
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
    """Dependency factory generating a permission check for endpoints."""
    def permission_checker(user: UserRecord = Depends(require_auth)) -> UserRecord:
        allowed = ROLE_PERMISSIONS.get(user.role, [])
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.value}' does not have required permission '{permission}'.",
            )
        return user
    return permission_checker
