import os
import logging
from typing import List
import requests

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

ENV_PATHS = [
    os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '.env'),
]
for env_path in ENV_PATHS:
    if os.path.exists(env_path):
        if load_dotenv:
            load_dotenv(env_path)
        break

from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
TELEGRAM_ADMIN_IDS_STR = os.getenv("TELEGRAM_ADMIN_IDS", "8673286954")
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://your-miniapp.vercel.app")
ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")

try:
    ADMIN_IDS = [int(x.strip()) for x in TELEGRAM_ADMIN_IDS_STR.split(",") if x.strip()]
except ValueError:
    ADMIN_IDS = [8673286954]

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

def register_or_update_user(user_id, first_name, last_name, username):
    """تسجيل أو تحديث المستخدم في قاعدة البيانات عبر الـ Backend"""
    try:
        payload = {
            "telegram_id": user_id,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "username": username or "",
        }
        response = requests.post(f"{BACKEND_URL}/api/auth/telegram", json=payload, timeout=5)
        if response.ok:
            return response.json()
        else:
            logger.warning(f"Backend returned {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return None

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"
    last_name = update.effective_user.last_name or ""
    username = update.effective_user.username or ""

    # تسجيل أو تحديث المستخدم تلقائياً
    user_data = register_or_update_user(user_id, first_name, last_name, username)

    keyboard = [
        [InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=MINIAPP_URL))]
    ]

    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    if user_data:
        vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}" if user_data.get('vip_level', 0) > 0 else ""
        balance = user_data.get('balance', 0)
        await update.message.reply_text(
            f"مرحبًا {first_name}{vip_text} 👋\n\n"
            f"رصيدك: {balance:.2f}$\n\n"
            "أهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )
    else:
        await update.message.reply_text(
            f"مرحبًا {first_name} 👋\n\n"
            "أهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )

async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = register_or_update_user(
        user_id,
        update.effective_user.first_name or "",
        update.effective_user.last_name or "",
        update.effective_user.username or ""
    )
    if user_data:
        vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}" if user_data.get('vip_level', 0) > 0 else ""
        kyc_status = user_data.get('kyc_status', 'غير موثق')
        balance = user_data.get('balance', 0)
        message = (
            f"👤 معلوماتك:\n"
            f"الاسم: {user_data.get('first_name', '')} {user_data.get('last_name', '')}\n"
            f"Telegram ID: {user_id}\n"
            f"الرصيد: {balance:.2f}$\n"
            f"الحالة KYC: {kyc_status}\n"
            f"مستوى VIP: {user_data.get('vip_level', 0)}{vip_text}\n"
        )
        await update.message.reply_text(message)
    else:
        await update.message.reply_text("تعذر جلب معلوماتك. حاول لاحقًا.")

def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في ملف .env")
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    return application

def run_polling():
    application = create_application()
    logger.info("بدء تشغيل البوت في وضع الاستطلاع...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    run_polling()
