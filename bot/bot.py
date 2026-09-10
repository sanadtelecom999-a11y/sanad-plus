import os
import logging
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
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus.vercel.app")
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


# ============================================================
# ============ Version (Cache Buster) ============
# ============================================================
# ⚠️ ارفع هذا الرقم في كل مرة تنشر تحديثاً جديداً للـ MiniApp
MINIAPP_VERSION = "3"


def get_miniapp_url():
    """إرجاع رابط MiniApp مع cache buster لضمان تحميل النسخة الجديدة"""
    separator = "&" if "?" in MINIAPP_URL else "?"
    return f"{MINIAPP_URL}{separator}v={MINIAPP_VERSION}"


# ============================================================
# ============ Register / Update User ============
# ============================================================
def register_or_update_user(user_id, first_name, last_name, username):
    """تسجيل أو تحديث المستخدم عبر الـ Backend"""
    try:
        payload = {
            "telegram_id": user_id,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "username": username or "",
        }
        response = requests.post(
            f"{BACKEND_URL}/api/auth/telegram",
            json=payload,
            timeout=8
        )
        if response.ok:
            data = response.json()
            logger.info(f"✅ تم تسجيل/تحديث المستخدم {user_id}")
            return data
        else:
            logger.warning(f"⚠️ Backend رجع {response.status_code} — {response.text[:200]}")
            return None
    except Exception as e:
        logger.error(f"❌ خطأ في تسجيل المستخدم: {e}")
        return None


# ============================================================
# ============ /start ============
# ============================================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"
    last_name = update.effective_user.last_name or ""
    username = update.effective_user.username or ""

    logger.info(f"📥 /start من {user_id} - {first_name} @{username}")

    # ✅ دائماً: تحديث بيانات المستخدم في DB
    user_data = register_or_update_user(user_id, first_name, last_name, username)

    # بناء الأزرار
    keyboard = [
        [InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=get_miniapp_url()))]
    ]

    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    if user_data:
        vip_text = ""
        if user_data.get('vip_level', 0) > 0:
            vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}"

        balance = user_data.get('balance', 0)
        await update.message.reply_text(
            f"مرحباً {first_name}{vip_text} 👋\n\n"
            f"💰 رصيدك: {balance:.2f}$\n\n"
            f"أهلاً بك في متجر SANAD PLUS⁺\n"
            f"اختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )
    else:
        await update.message.reply_text(
            f"مرحباً {first_name} 👋\n\n"
            f"أهلاً بك في متجر SANAD PLUS⁺\n"
            f"اختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )


# ============================================================
# ============ /me ============
# ============================================================
async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id

    user_data = register_or_update_user(
        user_id,
        update.effective_user.first_name or "",
        update.effective_user.last_name or "",
        update.effective_user.username or ""
    )

    if user_data:
        vip_text = ""
        if user_data.get('vip_level', 0) > 0:
            vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}"

        kyc_status = user_data.get('kyc_status', 'غير موثق')
        balance = user_data.get('balance', 0)

        message = (
            f"👤 معلوماتك:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"الاسم: {user_data.get('first_name', '')} {user_data.get('last_name', '')}\n"
            f"Telegram ID: `{user_id}`\n"
            f"الرصيد: {balance:.2f}$\n"
            f"الحالة KYC: {kyc_status}\n"
            f"مستوى VIP: {user_data.get('vip_level', 0)}{vip_text}\n"
        )
        await update.message.reply_text(message, parse_mode="Markdown")
    else:
        await update.message.reply_text("تعذر جلب معلوماتك. حاول لاحقاً.")


# ============================================================
# ============ App Setup ============
# ============================================================
def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في ملف .env")

    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    return application


def run_polling():
    application = create_application()
    logger.info(f"🚀 بدء تشغيل البوت — MiniApp Version: {MINIAPP_VERSION}")
    logger.info(f"🔗 MiniApp URL: {get_miniapp_url()}")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_polling()