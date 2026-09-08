import os
import logging
from typing import List
import requests
from datetime import datetime

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# تحميل .env من مجلد backend أو الجذر
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

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"

    keyboard = [
        [InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=MINIAPP_URL))]
    ]

    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    # محاولة جلب بيانات المستخدم من الـ Backend
    vip_text = ""
    try:
        response = requests.get(f"{BACKEND_URL}/api/user/me", params={"telegram_id": user_id}, timeout=3)
        if response.ok:
            user_data = response.json()
            vip_level = user_data.get("vip_level", 0)
            if vip_level > 0:
                vip_text = f" 👑 VIP{vip_level}"
            balance = user_data.get("balance", 0)
            await update.message.reply_text(
                f"مرحبًا {first_name}{vip_text} 👋\n\n"
                f"رصيدك: {balance:.2f}$\n\n"
                "أهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
                reply_markup=reply_markup,
            )
            return
    except Exception as e:
        logger.error(f"Error fetching user data: {e}")

    await update.message.reply_text(
        f"مرحبًا {first_name} 👋\n\n"
        "أهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
        reply_markup=reply_markup,
    )

async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    try:
        response = requests.get(f"{BACKEND_URL}/api/user/me", params={"telegram_id": user_id}, timeout=5)
        if response.ok:
            user_data = response.json()
            vip_level = user_data.get("vip_level", 0)
            vip_text = f" 👑 VIP{vip_level}" if vip_level > 0 else ""
            kyc_status = user_data.get("kyc_status", "غير موثق")
            balance = user_data.get("balance", 0)
            message = (
                f"👤 معلوماتك:\n"
                f"الاسم: {user_data.get('first_name', '')} {user_data.get('last_name', '')}\n"
                f"Telegram ID: {user_id}\n"
                f"الرصيد: {balance:.2f}$\n"
                f"الحالة KYC: {kyc_status}\n"
                f"مستوى VIP: {vip_level}{vip_text}\n"
            )
            await update.message.reply_text(message)
        else:
            await update.message.reply_text("تعذر جلب معلوماتك. حاول لاحقًا.")
    except Exception as e:
        logger.error(f"Error in /me: {e}")
        await update.message.reply_text("حدث خطأ أثناء جلب البيانات.")

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
