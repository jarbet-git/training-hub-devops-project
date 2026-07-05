from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _read_default_version() -> str:
    """Read the default application version from the repository VERSION file."""
    version_file = Path(__file__).resolve().parents[3] / "VERSION"
    try:
        value = version_file.read_text(encoding="utf-8").strip()
    except OSError:
        return "0.9.4-dev"
    return value or "0.9.4-dev"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ACCESS_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 14

    APP_VERSION: str = _read_default_version()
    MEDIA_ROOT: str = "media"
    MEDIA_URL: str = "/media"
    MAX_AVATAR_SIZE_MB: int = 2

    MAIL_ENABLED: bool = False
    MAIL_HOST: str | None = None
    MAIL_PORT: int = 25
    MAIL_USE_TLS: bool = False
    MAIL_USE_SSL: bool = False
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM_EMAIL: str | None = None
    MAIL_FROM_NAME: str | None = None
    MAIL_TIMEOUT_SECONDS: int = 10

    FRONTEND_URL: str | None = None
    RESET_PASSWORD_EXPIRE_MINUTES: int = 60
    ACCOUNT_ACTIVATION_TOKEN_TTL_HOURS: int = 24


settings = Settings()
