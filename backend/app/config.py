"""
SANAD PLUS+ - Application Configuration
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0
NO AUTOMATED EDITS - incidents #6 #7 #8 #9.
"""
import os


class Config:
    # ──────────────────────────────────────────────────────────
    # 1. Database
    # ──────────────────────────────────────────────────────────
    _DB_URL = os.getenv("DATABASE_URL", "").strip()

    # Detect PostgreSQL vs SQLite by URL prefix (dialect), not host string.
    _IS_POSTGRES = _DB_URL.startswith(("postgresql://", "postgres://"))

    _LOCAL_HOST_MARKERS = (
        "localhost", "127.0.0.1", "::1", "db:", "postgres:", "testserver",
    )
    _IS_LOCAL_DB = False
    for _m in _LOCAL_HOST_MARKERS:
        if _m in _DB_URL:
            _IS_LOCAL_DB = True
            break

    # SSL only for remote Postgres (Neon, RDS, etc.)
    _USE_SSL = _IS_POSTGRES and not _IS_LOCAL_DB

    if _IS_POSTGRES:
        SQLALCHEMY_ENGINE_OPTIONS = {
            "connect_args": {"sslmode": "require"} if _USE_SSL else {},
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }
    else:
        # SQLite (local tests only) - no pool, no sslmode, no pre_ping.
        SQLALCHEMY_ENGINE_OPTIONS = {}

    SQLALCHEMY_DATABASE_URI = _DB_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ──────────────────────────────────────────────────────────
    # 2. Flask + JWT
    # ──────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES = 7200

    # ──────────────────────────────────────────────────────────
    # 3. Admin
    # ──────────────────────────────────────────────────────────
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
    TELEGRAM_ADMIN_IDS = [
        int(x.strip())
        for x in os.getenv("TELEGRAM_ADMIN_IDS", "").split(",")
        if x.strip().isdigit()
    ]

    # ──────────────────────────────────────────────────────────
    # 4. CORS
    # ──────────────────────────────────────────────────────────
    _ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "")
    ALLOWED_ORIGINS = [
        o.strip() for o in _ALLOWED_ORIGINS_STR.split(",") if o.strip()
    ]
    if not ALLOWED_ORIGINS:
        ALLOWED_ORIGINS = [
            "https://sanad-plus.vercel.app",
            "https://sanad-plus-admi.vercel.app",
        ]

    # ──────────────────────────────────────────────────────────
    # 5. Redis
    # ──────────────────────────────────────────────────────────
    REDIS_URL = os.getenv("REDIS_URL", "")

    # ──────────────────────────────────────────────────────────
    # 6. Telegram
    # ──────────────────────────────────────────────────────────
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")
    SKIP_BOT = os.getenv("SKIP_BOT", "0") == "1"

    # ──────────────────────────────────────────────────────────
    # 7. External services
    # ──────────────────────────────────────────────────────────
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")
    CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")
    BACKUP_PASSPHRASE = os.getenv("BACKUP_PASSPHRASE", "")

    # ──────────────────────────────────────────────────────────
    # 8. Environment
    # ──────────────────────────────────────────────────────────
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = FLASK_ENV == "development"
    TESTING = FLASK_ENV == "testing"

    # ──────────────────────────────────────────────────────────
    # 9. Validation
    # ──────────────────────────────────────────────────────────
    _WEAK_DEFAULTS = frozenset({
        "secret", "changeme", "change-me", "your-secret-key",
        "flask-secret", "default-secret-key", "dev", "development",
        "test", "password", "1234567890",
    })

    if not SECRET_KEY or len(SECRET_KEY) < 32 or SECRET_KEY.lower() in _WEAK_DEFAULTS:
        raise RuntimeError(
            "SECRET_KEY must be at least 32 characters and not a known weak default."
        )
    if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
        raise RuntimeError("JWT_SECRET_KEY must be at least 32 characters.")
    if not _DB_URL:
        raise RuntimeError("DATABASE_URL environment variable is required.")
