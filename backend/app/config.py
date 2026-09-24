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
    # ─── Flask ───
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

    # ─── JWT ───
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ERROR_MESSAGE_KEY = "error"

    # ─── Database ───
    SQLALCHEMY_DATABASE_URI = _get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {
            "sslmode": "require",
            "connect_timeout": 10,
        },
    }

    # ─── Bot / URLs ───
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")
    MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus.vercel.app")
    ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
    BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")

    # ─── CORS ───
    _origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    ALLOWED_ORIGINS = [o.strip() for o in _origins.split(",") if o.strip()]
    if not ALLOWED_ORIGINS:
        ALLOWED_ORIGINS = [
            "https://sanad-plus.vercel.app",
            "https://sanad-plus-admi.vercel.app",
        ]

    # ─── Redis ───
    REDIS_URL = os.getenv("REDIS_URL", "")

    # ─── Admin OTP ───
    ADMIN_OTP_STRICT_IP = os.getenv("ADMIN_OTP_STRICT_IP", "false").lower() == "true"