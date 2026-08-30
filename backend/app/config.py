from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment or defaults."""
    
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # QML Defaults
    FAST_DEMO_MODE: bool = True
    DEFAULT_QUANTUM_QUBITS: int = 6
    DEFAULT_VQC_LAYERS: int = 2
    DEFAULT_VQC_MAX_ITER: int = 25
    RANDOM_SEED: int = 42
    
    # File Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    SAMPLES_DIR: Path = BASE_DIR / "samples"
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 15

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

# Ensure directories exist
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
