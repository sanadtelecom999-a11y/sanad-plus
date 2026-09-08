import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///sanadplus.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")
    TELEGRAM_ADMIN_IDS = os.getenv("TELEGRAM_ADMIN_IDS", "8673286954")
    MINIAPP_URL = os.getenv("MINIAPP_URL", "https://your-miniapp.vercel.app")
    ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "http://localhost:5000/admin")
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}