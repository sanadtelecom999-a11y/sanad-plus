import os
import logging
import requests
import time
from collections import defaultdict

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

# ============================================================
# ============ Environment Variables ============
# ============================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
TELEGRAM_ADMIN_IDS_STR = os.getenv("TELEGRAM_ADMIN_IDS", "")
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus.vercel.app")
ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")
BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")

try:
    ADMIN_IDS = [int(x.strip()) for x in TELEGRAM_ADMIN_IDS_STR.split(",") if x.strip()]
except ValueError:
    ADMIN_IDS = []

# ============================================================
# ============ Logging Setup ============
# ============================================================
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


# ============================================================
# ============ Version (Cache Buster) ============
# ============================================================
MINIAPP_VERSION = "4"


def get_miniapp_url():
    """رابط MiniApp مع cache buster"""
    separator = "&" if "?" in MINIAPP_URL else "?"
    return f"{MINIAPP_URL}{separator}v={MINIAPP_VERSION}"


# ============================================================
# ============ 🛡️ Rate Limiting ============
# ============================================================
_rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10


def is_rate_limited(user_id):
    """فحص إذا كان المستخدم قد تجاوز الحد المسموح"""
    if user_id in ADMIN_IDS:
        return False

    now = time.time()
    _rate_limit_store[user_id] = [
        t for t in _rate_limit_store[user_id]
        if now - t < RATE_LIMIT_WINDOW
    ]
    if len(_rate_limit_store[user_id]) >= RATE_LIMIT_MAX:
        return True
    _rate_limit_store[user_id].append(now)
    return False


# ============================================================
# ============ 🛡️ Notify Admins ============
# ============================================================
def notify_admins_sync(message: str, important: bool = False):
    """إرسال تنبيه لكل الأدمن"""
    emoji = "🚨" if important else "ℹ️"
    full_message = f"{emoji} {message}"

    for admin_id in ADMIN_IDS:
        try:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": admin_id,
                "text": full_message,
                "parse_mode": "Markdown"
            }
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"فشل إرسال تنبيه للأدمن {admin_id}: {e}")


# ============================================================
# ============ Register / Update User ============
# ============================================================
def register_or_update_user(user_id, first_name, last_name, username):
    """تسجيل أو تحديث المستخدم عبر الـ Backend (مسار البوت)"""
    try:
        payload = {
            "telegram_id": user_id,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "username": username or "",
        }
        headers = {
            "X-Bot-Token": BOT_API_SECRET,
            "Content-Type": "application/json",
        }
        response = requests.post(
            f"{BACKEND_URL}/api/bot/auth",
            json=payload,
            headers=headers,
            timeout=8
        )
        if response.ok:
            data = response.json()
            logger.info(f"✅ تم تسجيل/تحديث المستخدم {user_id}")
            return data
        else:
            logger.warning(
                f"⚠️ Backend رجع {response.status_code} — {response.text[:200]}"
            )
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

    if is_rate_limited(user_id):
        logger.warning(f"🚫 Rate limit تجاوز المستخدم {user_id}")
        await update.message.reply_text(
            "⚠️ لقد تجاوزت الحد المسموح من الأوامر.\n"
            "يرجى المحاولة بعد دقيقة."
        )
        return

    logger.info(f"📥 /start من {user_id} - {first_name} @{username}")

    user_data = register_or_update_user(user_id, first_name, last_name, username)

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
        notify_admins_sync(
            f"⚠️ فشل تسجيل مستخدم\n"
            f"ID: `{user_id}`\n"
            f"الاسم: {first_name}",
            important=True
        )
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

    if is_rate_limited(user_id):
        await update.message.reply_text("⚠️ يرجى المحاولة بعد قليل.")
        return

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
# ============ /admin_info (للأدمن فقط) ============
# ============================================================
async def admin_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عرض معلومات النظام للأدمن"""
    user_id = update.effective_user.id

    if user_id not in ADMIN_IDS:
        logger.warning(f"🚫 محاولة وصول غير مصرح بها لـ /admin_info من {user_id}")
        notify_admins_sync(
            f"🚫 محاولة وصول غير مصرح بها\n"
            f"المستخدم: `{user_id}`\n"
            f"الأمر: /admin_info",
            important=True
        )
        await update.message.reply_text("⛔ غير مصرح.")
        return

    info = (
        f"📊 **معلومات النظام**\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🤖 **البوت:** يعمل\n"
        f"📦 **إصدار MiniApp:** v{MINIAPP_VERSION}\n"
        f"🔗 **MiniApp URL:** {get_miniapp_url()}\n"
        f"🖥️ **Backend:** {BACKEND_URL}\n"
        f"👥 **عدد الأدمن:** {len(ADMIN_IDS)}\n"
    )
    await update.message.reply_text(info, parse_mode="Markdown")


# ============================================================
# ============ 🛡️ Global Error Handler ============
# ============================================================
async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """التعامل مع الأخطاء غير المتوقعة"""
    error_str = str(context.error)

    if "Conflict" in error_str or "terminated by other getUpdates" in error_str:
        logger.warning(f"⚠️ Conflict مؤقت — سيُحل تلقائياً")
        return

    logger.error(f"❌ خطأ في البوت: {context.error}")

    if context.error:
        error_short = str(context.error)[:300]
        notify_admins_sync(
            f"❌ **خطأ في البوت**\n"
            f"`{error_short}`",
            important=True
        )


# ============================================================
# ============ App Setup ============
# ============================================================
def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في ملف .env")

    application = Application.builder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    application.add_handler(CommandHandler("admin_info", admin_info))

    application.add_error_handler(error_handler)

    return application


def run_polling():
    application = create_application()
    logger.info(f"🚀 بدء تشغيل البوت — MiniApp Version: {MINIAPP_VERSION}")
    logger.info(f"🔗 MiniApp URL: {get_miniapp_url()}")
    logger.info(f"👥 عدد الأدمن: {len(ADMIN_IDS)}")

    notify_admins_sync(
        f"✅ البوت بدأ العمل\n"
        f"MiniApp v{MINIAPP_VERSION}"
    )

    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_polling()