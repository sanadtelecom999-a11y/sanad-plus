# ============================================================
# ⚙️ Config — v18.2.3
# ============================================================
# 🆕 v18.2.3: force psycopg2 driver explicitly
# السبب: SQLAlchemy 2.0.54 على Python 3.14 يحاول استخدام psycopg (v3)
#        إذا فشل في إيجاد psycopg2. نجبره على psycopg2 هنا.
# ============================================================
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _get_database_url():
    """
    يقرأ DATABASE_URL ويجبر driver على psycopg2.
    هذا يمنع SQLAlchemy من محاولة استخدام psycopg (v3).
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return ""

    # postgresql:// → postgresql+psycopg2://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # postgres:// (Heroku-style) → postgresql+psycopg2://
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)

    return url


class Config:

    _db_url = os.getenv("DATABASE_URL", "")
    _is_local = any(h in _db_url for h in ("localhost", "127.0.0.1", "::1", "db:", "postgres:"))

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {"sslmode": "require", "connect_timeout": 10} if not _is_local else {"connect_timeout": 10},
    }
    # ─── Flask ───
    # v18.4.15: Fail loud — refuse insecure defaults
    _SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
    if (
        not _SECRET_KEY
        or len(_SECRET_KEY) < 32
        or _SECRET_KEY in ("change-me", "changeme", "secret")
    ):
        raise RuntimeError(
            "SECRET_KEY must be at least 32 characters and not a known weak default. "
            "Refusing to start."
        )
    SECRET_KEY = _SECRET_KEY

    # ─── JWT ───
    # v18.4.15: JWT_SECRET_KEY must be explicit (not inherited)
    _JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
    if (
        not _JWT_SECRET_KEY
        or len(_JWT_SECRET_KEY) < 32
    ):
        raise RuntimeError(
            "JWT_SECRET_KEY must be at least 32 characters and set explicitly. "
            "Inheriting from SECRET_KEY is forbidden."
        )
    JWT_SECRET_KEY = _JWT_SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ERROR_MESSAGE_KEY = "error"

    # ─── Database ───
    SQLALCHEMY_DATABASE_URI = _get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
            SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"sslmode": "require"} if not _is_local else {}
    }
