import os
class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    db_url = os.getenv("DATABASE_URL", "")
    SQLALCHEMY_DATABASE_URI = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    REDIS_URL = os.getenv("REDIS_URL", "")
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
