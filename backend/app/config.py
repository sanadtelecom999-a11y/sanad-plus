import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def is_production() -> bool:
    """Render يُضيف RENDER=true تلقائياً في production"""
    return (
        os.getenv("RENDER") is not None
        or os.getenv("FLASK_ENV") == "production"
    )


class Config:
    # ============ 🔐 الأسرار (إلزامية في production) ============
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    BOT_API_SECRET = os.getenv("BOT_API_SECRET")

    if is_production():
        _missing = []
        if not SECRET_KEY:
            _missing.append("SECRET_KEY")
        if not JWT_SECRET_KEY:
            _missing.append("JWT_SECRET_KEY")
        if not BOT_API_SECRET:
            _missing.append("BOT_API_SECRET")
        if _missing:
            raise RuntimeError(
                f"❌ متغيرات بيئة إلزامية مفقودة: {', '.join(_missing)}"
            )
    else:
        if not SECRET_KEY:
            print("⚠️ SECRET_KEY غير معرّف — استخدام قيمة تطوير")
            SECRET_KEY = "dev-secret-key-do-not-use-in-prod"
        if not JWT_SECRET_KEY:
            print("⚠️ JWT_SECRET_KEY غير معرّف — استخدام قيمة تطوير")
            JWT_SECRET_KEY = "dev-jwt-secret-do-not-use-in-prod"
        if not BOT_API_SECRET:
            print("⚠️ BOT_API_SECRET غير معرّف — البوت لن يعمل محلياً")
            BOT_API_SECRET = "dev-bot-secret"

    # ============ 🗄️ Database ============
    _db_url = os.getenv("DATABASE_URL", "")
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)

    if is_production() and not _db_url:
        raise RuntimeError("❌ DATABASE_URL مفقود في production")

    SQLALCHEMY_DATABASE_URI = _db_url or "sqlite:///sanadplus-dev.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

    # ============ 🔐 JWT ============
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # ============ 📱 Telegram ============
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    MINIAPP_URL = os.getenv("MINIAPP_URL", "")
    ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "")
    BACKEND_URL = os.getenv("BACKEND_URL", "")

    _admin_ids_raw = os.getenv("TELEGRAM_ADMIN_IDS", "")
    TELEGRAM_ADMIN_IDS = [
        int(x.strip()) for x in _admin_ids_raw.split(",")
        if x.strip().isdigit()
    ]

    # ============ 📁 Uploads ============
    IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

    # ============ 🌐 CORS ============
    ALLOWED_ORIGINS = [
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "https://sanad-plus.vercel.app,https://sanad-plus-admi.vercel.app"
        ).split(",")
        if o.strip()
    ]