import os
class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "prod-secret")
    db_url = os.getenv("DATABASE_URL", "")
    #  ÕÊÌ· «·—«»ÿ ·Ì Ê«›ﬁ „⁄ psycopg3
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "prod-jwt-secret")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
