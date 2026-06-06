import os
import secrets
from datetime import timedelta

def _require_env(name: str, fallback_for_dev: str | None = None) -> str:
    value = os.environ.get(name)
    if value:
        return value
    if os.environ.get('FLASK_ENV') == 'production' or os.environ.get('FLASK_DEBUG', 'false').lower() == 'false' and fallback_for_dev is None:
        raise RuntimeError(
            f"Required environment variable '{name}' is not set. "
            "Set it in your platform environment or .env file."
        )
    return fallback_for_dev or secrets.token_hex(32)

class Config:
    SECRET_KEY = _require_env('SECRET_KEY', 'dev-secret-change-me')

    # Database
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    _db_url = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(basedir, 'applywise.db')
    # Normalize legacy "postgres://" and use psycopg3 driver for postgresql URLs
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    if _db_url.startswith('postgresql://'):
        _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = _require_env('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # AI usage limits
    DAILY_AI_LIMIT = int(os.environ.get('DAILY_AI_LIMIT', 20))
