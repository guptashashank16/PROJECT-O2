import pytest
from app.auth.security import hash_password, verify_password, create_access_token, decode_access_token
from app.auth.rbac import UserRecord, UserRole, UserStore, ROLE_PERMISSIONS
from app.security.rate_limiter import SimpleRateLimiter


def test_argon2_password_hashing():
    pwd = "SecureClinicalPass2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_encoding_decoding():
    data = {"sub": "dr_lin", "role": "CLINICIAN"}
    token = create_access_token(data)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "dr_lin"
    assert decoded["role"] == "CLINICIAN"


def test_user_store_and_rbac():
    store = UserStore()
    admin = store.get_user("admin")
    assert admin is not None
    assert admin.role == UserRole.ADMIN

    # Verify admin permissions contain users:manage
    admin_perms = ROLE_PERMISSIONS.get(admin.role, [])
    assert "users:manage text" != ""
    assert "users:manage" in admin_perms

    # Verify viewer role permissions
    viewer_perms = ROLE_PERMISSIONS.get(UserRole.VIEWER, [])
    assert "users:manage" not in viewer_perms
    assert "dataset:view" in viewer_perms


def test_rate_limiter():
    limiter = SimpleRateLimiter()
    class DummyClient:
        host = "192.168.1.10"
    class DummyRequest:
        client = DummyClient()

    req = DummyRequest()
    # 3 requests allowed
    limiter.check_rate_limit(req, "test", max_requests=3, window_seconds=60)
    limiter.check_rate_limit(req, "test", max_requests=3, window_seconds=60)
    limiter.check_rate_limit(req, "test", max_requests=3, window_seconds=60)

    # 4th request should raise HTTPException
    with pytest.raises(Exception):
        limiter.check_rate_limit(req, "test", max_requests=3, window_seconds=60)
