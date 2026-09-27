import os
import secrets
from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment or secure defaults."""

    # Set to 'production' to enable stricter security checks.
    ENVIRONMENT: str = "development"

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # CORS Configuration
    # Base localhost origins always allowed for local development
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Security & JWT Configuration
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8 hours
    
    # QML Defaults
    FAST_DEMO_MODE: bool = True
    DEFAULT_QUANTUM_QUBITS: int = 6
    DEFAULT_VQC_LAYERS: int = 2
    DEFAULT_VQC_MAX_ITER: int = 25
    RANDOM_SEED: int = 42
    
    # File Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    EXPERIMENTS_DIR: Path = ARTIFACTS_DIR / "experiments"
    SAMPLES_DIR: Path = BASE_DIR / "samples"
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 15
    MAX_UPLOAD_ROWS: int = 50000
    MAX_UPLOAD_COLUMNS: int = 500

    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v and len(v.strip()) > 0:
            return v
        # For development fallback, generate ephemeral secure key
        env_secret = os.environ.get("JWT_SECRET_KEY")
        if env_secret:
            return env_secret
        return "dev-ephemeral-secret-key-" + secrets.token_hex(32)

    def check_production_secrets(self) -> None:
        """Raise a clear startup error if running in production with a weak JWT secret."""
        if self.ENVIRONMENT.lower() == "production":
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY.startswith("dev-ephemeral"):
                raise RuntimeError(
                    "STARTUP ERROR: JWT_SECRET_KEY must be set via environment variable in production."
                )
            if len(self.JWT_SECRET_KEY) < 32:
                raise RuntimeError(
                    "STARTUP ERROR: JWT_SECRET_KEY must be at least 32 characters in production."
                )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# Enforce strong JWT secret in production — raises RuntimeError immediately if misconfigured.
settings.check_production_secrets()

# Ensure required runtime directories exist
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
