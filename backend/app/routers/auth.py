from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from app.auth.rbac import UserRecord, UserRole, get_current_user, require_permission, user_store
from app.auth.security import create_access_token, hash_password, verify_password
from app.security.audit import audit_logger
from app.security.rate_limiter import rate_limiter

router = APIRouter(prefix="/auth", tags=["Authentication & User Security"])


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    full_name: str
    permissions: List[str]


class UserProfileResponse(BaseModel):
    username: str
    email: str
    role: str
    full_name: str
    permissions: List[str]


class RoleUpdateRequest(BaseModel):
    role: UserRole


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request):
    """Authenticate user credentials and issue JWT bearer token."""
    rate_limiter.check_rate_limit(request, "login", max_requests=10, window_seconds=60)
    
    user = user_store.get_user(req.username_or_email)
    if not user or not verify_password(req.password, user.hashed_password):
        audit_logger.log("anonymous", "UNKNOWN", "LOGIN", "FAILED", f"Failed attempt for {req.username_or_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user.username, "role": user.role.value})
    
    from app.auth.rbac import ROLE_PERMISSIONS
    permissions = ROLE_PERMISSIONS.get(user.role, [])
    
    audit_logger.log(user.username, user.role.value, "LOGIN", "SUCCESS", "User authenticated successfully")

    return TokenResponse(
        access_token=token,
        username=user.username,
        role=user.role.value,
        full_name=user.full_name,
        permissions=permissions,
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, request: Request):
    """Register a new platform user. Default role is assigned as VIEWER for system security."""
    rate_limiter.check_rate_limit(request, "register", max_requests=5, window_seconds=60)

    if user_store.get_user(req.username):
        raise HTTPException(status_code=400, detail="Username is already registered.")

    # Public self-registration ALWAYS defaults to VIEWER
    hashed = hash_password(req.password)
    new_user = UserRecord(
        username=req.username.strip(),
        email=req.email.strip(),
        hashed_password=hashed,
        role=UserRole.VIEWER,
        full_name=req.full_name.strip() if req.full_name else req.username,
    )
    user_store.add_user(new_user)
    
    token = create_access_token({"sub": new_user.username, "role": new_user.role.value})
    from app.auth.rbac import ROLE_PERMISSIONS
    permissions = ROLE_PERMISSIONS.get(new_user.role, [])

    audit_logger.log(new_user.username, new_user.role.value, "REGISTER", "SUCCESS", "New user self-registered")

    return TokenResponse(
        access_token=token,
        username=new_user.username,
        role=new_user.role.value,
        full_name=new_user.full_name,
        permissions=permissions,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: Optional[UserRecord] = Depends(get_current_user)):
    """Retrieve profile and permissions for currently authenticated user session."""
    if not current_user:
        # Return guest profile for unauthenticated interface state
        from app.auth.rbac import ROLE_PERMISSIONS
        return UserProfileResponse(
            username="guest",
            email="guest@qcare.local",
            role="VIEWER",
            full_name="Guest Viewer",
            permissions=ROLE_PERMISSIONS.get(UserRole.VIEWER, []),
        )

    from app.auth.rbac import ROLE_PERMISSIONS
    return UserProfileResponse(
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value,
        full_name=current_user.full_name,
        permissions=ROLE_PERMISSIONS.get(current_user.role, []),
    )


@router.get("/users", response_model=List[UserProfileResponse])
async def list_users(admin: UserRecord = Depends(require_permission("users:manage"))):
    """Admin-only endpoint listing all registered platform users."""
    from app.auth.rbac import ROLE_PERMISSIONS
    users = user_store.list_users()
    return [
        UserProfileResponse(
            username=u.username,
            email=u.email,
            role=u.role.value,
            full_name=u.full_name,
            permissions=ROLE_PERMISSIONS.get(u.role, []),
        )
        for u in users
    ]


@router.put("/users/{username}/role", response_model=UserProfileResponse)
async def update_user_role(
    username: str,
    req: RoleUpdateRequest,
    admin: UserRecord = Depends(require_permission("users:manage")),
):
    """Admin-only endpoint promoting or updating user roles."""
    updated = user_store.update_role(username, req.role)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")

    from app.auth.rbac import ROLE_PERMISSIONS
    audit_logger.log(admin.username, admin.role.value, "ROLE_UPDATE", "SUCCESS", f"Updated {username} to {req.role.value}")

    return UserProfileResponse(
        username=updated.username,
        email=updated.email,
        role=updated.role.value,
        full_name=updated.full_name,
        permissions=ROLE_PERMISSIONS.get(updated.role, []),
    )
