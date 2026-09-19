import datetime
import logging
import hashlib
from typing import Any, Dict, Optional
import jwt

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError
    ph = PasswordHasher()
    HAS_ARGON2 = True
except Exception:
    HAS_ARGON2 = False
    ph = None

logger = logging.getLogger("hybrid-quantum-medical-ai")

# Default secret key for local hackathon demo; override via ENV in production
JWT_SECRET_KEY = "q-care-super-secret-jwt-key-2026-hackathon-demo-only"
JWT_ALGORITHM = "HS256"
DEFAULT_TOKEN_EXPIRE_MINUTES = 480  # 8 hours


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id with standard fallback."""
    if HAS_ARGON2 and ph is not None:
        try:
            return ph.hash(password)
        except Exception as e:
            logger.warning(f"Argon2 hashing error: {e}")
    # Fallback to salted SHA256 if argon2 package is loading in lightweight environment
    salt = "qcare_argon2_fallback_salt_"
    return "sha256$" + hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its Argon2id hash."""
    if not hashed_password:
        return False
    if HAS_ARGON2 and hashed_password.startswith("$argon2"):
        try:
            return ph.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger.error(f"Argon2 verification error: {e}")
            return False
    elif hashed_password.startswith("sha256$"):
        salt = "qcare_argon2_fallback_salt_"
        expected = "sha256$" + hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return expected == hashed_password
    else:
        # Fallback raw match check for legacy test users if any
        return plain_password == hashed_password


def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a JWT access token containing standard subject and role claims."""
    to_encode = data.copy()
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=DEFAULT_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "iat": now,
        "exp": expire,
    })
    
    # Ensure no sensitive values in token payload
    to_encode.pop("password", None)
    to_encode.pop("hashed_password", None)
    
    token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None
