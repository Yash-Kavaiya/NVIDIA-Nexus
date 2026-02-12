import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

# Locate .env: check backend/ first, then project root
_backend_dir = Path(__file__).resolve().parent.parent.parent
_project_root = _backend_dir.parent
_env_file = _backend_dir / ".env"
if not _env_file.exists():
    _env_file = _project_root / ".env"
_env_path = str(_env_file) if _env_file.exists() else ".env"


class Settings(BaseSettings):
    # App
    APP_NAME: str = "NVIDIA Nexus"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nvidia_nexus.db"

    # AI - Using the provided API key
    NVIDIA_API_KEY: Optional[str] = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DEFAULT_MODEL: str = "nvidia/nemotron-3-nano-30b-a3b"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: set = {
        "txt",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "mp3",
        "mp4",
        "zip",
        "rar",
        "7z",
        "json",
        "xml",
        "csv",
        "md",
        "py",
        "js",
        "ts",
        "html",
        "css",
    }

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Redis (for caching and task queue)
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = _env_path
        case_sensitive = True


settings = Settings()
