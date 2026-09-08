import os
import logging
from typing import List

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# تحميل .env من backend أو الجذر
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
ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanadplus-backend-x12d.onrender.com/admin/login")

try:
    ADMIN_IDS = [int(x.strip()) for x in TELEGRAM_ADMIN_IDS_STR.split(",") if x.strip()]
except ValueError:
    ADMIN_IDS = [8673286954]

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"

    keyboard = [
        [InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=MINIAPP_URL))]
    ]

    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"مرحبًا {first_name} 👋\n\nأهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
        reply_markup=reply_markup,
    )

def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في ملف .env")
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    return application

def run_polling():
    application = create_application()
    logger.info("بدء تشغيل البوت في وضع الاستطلاع...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    run_polling()