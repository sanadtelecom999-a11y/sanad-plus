import os
class Config:
    # إعدادات SQLAlchemy لمنع انقطاع اتصال Neon
    _db_url = os.getenv("DATABASE_URL", "")
    _is_postgres = _db_url.startswith(("postgresql://", "postgres://"))
    
    if _is_postgres:
        # استخدام NullPool لإجبار SQLAlchemy على فتح وإغلاق الاتصال لكل طلب
        # هذا يمنع Neon من إغلاق الاتصال الخامل
        from sqlalchemy.pool import NullPool
        
        SQLALCHEMY_ENGINE_OPTIONS = {
            "poolclass": NullPool,  # إجباري: لا نستخدم Pool
            "pool_pre_ping": True,  # اختبار الاتصال قبل الاستخدام
            "connect_args": {
                "sslmode": "require",
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5,
            },
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {}

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "prod-jwt-secret")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
