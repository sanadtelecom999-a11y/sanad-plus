import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    _secret = os.environ.get("JWT_SECRET", "")
    # التحقق من قوة السر: 32 حرفاً على الأقل، وليس من القيم الشائعة
    if len(_secret) < 32 or _secret in ["super-secret-key", "dev-only-change-me", "admin123"]:
        if os.environ.get("FLASK_ENV") != "testing":
            raise ValueError("CRITICAL: JWT_SECRET must be cryptographically strong (min 32 bytes).")
    
    SECRET_KEY = _secret
    JWT_SECRET_KEY = _secret
    
    _db_url = os.environ.get("DATABASE_URL", "")
    if not _db_url and os.environ.get("FLASK_ENV") != "testing":
        raise ValueError("CRITICAL: DATABASE_URL is missing. SQLite fallback is disabled for production.")
        
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 86400
