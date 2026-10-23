import html
# ============================================================
# 🤖 SANAD PLUS⁺ Bot — v18.5.3 (Full Original + SRE All Fixes)
# ============================================================
import os
import logging
import requests
import time
import asyncio
from collections import defaultdict, deque
import redis

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

logger = logging.getLogger(__name__)

try:
    import sentry_sdk
    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
TELEGRAM_ADMIN_IDS_STR = os.getenv("TELEGRAM_ADMIN_IDS", "")
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus-admi.vercel.app/miniapp/" ).split('?')[0]
ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")
BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")
REDIS_URL = os.getenv("REDIS_URL", "")

ADMIN_IDS = []
for _x in TELEGRAM_ADMIN_IDS_STR.split(","):
    _x = _x.strip()
    if not _x:
        continue
    try:
        ADMIN_IDS.append(int(_x))
    except ValueError:
        logger.warning(f"⚠️ Invalid admin ID: {_x}")

redis_client = (
    redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=5)
    if REDIS_URL else None
)

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

MINIAPP_VERSION = "22"
BOT_VERSION = "v18.5.3-SRE"

def get_miniapp_url():
    separator = "&" if "?" in MINIAPP_URL else "?"
    return f"{MINIAPP_URL}{separator}v={MINIAPP_VERSION}"

# ============ 🛡 Rate Limiting ============
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10
_rate_limit_store = defaultdict(lambda: deque(maxlen=RATE_LIMIT_MAX))

async def is_rate_limited(user_id):
    if user_id in ADMIN_IDS:
        return False

    try:
        from app.services.cache_service import rate_limit_check
        result = await asyncio.to_thread(
            rate_limit_check,
            key=f"bot:{user_id}",
            max_requests=RATE_LIMIT_MAX,
            window_seconds=RATE_LIMIT_WINDOW,
        )
        if result is not None:
            return result
    except Exception as e:
        logger.warning(f"Redis rate-limit unavailable: {e}")

    now = time.time()
    dq = _rate_limit_store[user_id]
    while dq and now - dq[0] > RATE_LIMIT_WINDOW:
        dq.popleft()
    if len(dq) >= RATE_LIMIT_MAX:
        return True
    dq.append(now)
    return False

# ============ 🛡 Notify Admins ============
async def notify_admins_async(message: str, important: bool = False, use_markdown: bool = False):
    emoji = "🚨" if important else "ℹ️"
    full_message = f"{emoji} {message}"
    tasks = []
    for admin_id in ADMIN_IDS:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {"chat_id": admin_id, "text": full_message}
        if use_markdown:
            payload["parse_mode"] = "Markdown"
        tasks.append(asyncio.to_thread(requests.post, url, json=payload, timeout=5))
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for idx, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"فشل إرسال تنبيه للأدمن {ADMIN_IDS[idx]}: {res}")

def _notify_admins_at_startup(message: str):
    for admin_id in ADMIN_IDS:
        try:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            payload = {"chat_id": admin_id, "text": message}
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"فشل إرسال تنبيه للأدمن {admin_id}: {e}")

# ============ Register / Update User ============
async def register_or_update_user(user_id, first_name, last_name, username):
    try:
        payload = {"telegram_id": user_id, "first_name": first_name or "", "last_name": last_name or "", "username": username or ""}
        headers = {"X-Bot-Token": BOT_API_SECRET, "Content-Type": "application/json"}
        response = await asyncio.to_thread(
            requests.post,
            f"{BACKEND_URL}/api/bot/auth",
            json=payload, headers=headers, timeout=8
        )
        if response.ok:
            return response.json()
        else:
            logger.warning(f"⚠️ Backend رجع {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"❌ خطأ في تسجيل المستخدم: {e}")
        if _SENTRY_AVAILABLE:
            sentry_sdk.capture_exception(e)
        return None

# ============ Heartbeat ============
async def heartbeat_loop():
    try:
        from app.services.cache_service import cache_set
    except Exception as e:
        logger.error(f"❌ Cannot import cache_set: {e}")
        await notify_admins_async(f"❌ Heartbeat cannot start: {e}", important=True, use_markdown=False)
        return

    await asyncio.sleep(5)
    while True:
        try:
            now = int(time.time())
            ok = await asyncio.to_thread(cache_set, "bot:heartbeat", now, ttl=180)
            if not ok:
                logger.warning("⚠️ Heartbeat cache_set failed")
        except Exception as e:
            logger.warning(f"Heartbeat error: {e}")
        await asyncio.sleep(60)

_heartbeat_task = None

async def post_init(application: Application):
    global _heartbeat_task
    if _heartbeat_task and not _heartbeat_task.done():
        _heartbeat_task.cancel()
    logger.info("🚀 post_init: starting heartbeat loop")
    _heartbeat_task = asyncio.create_task(heartbeat_loop())

async def post_shutdown(application: Application):
    global _heartbeat_task
    if _heartbeat_task and not _heartbeat_task.done():
        _heartbeat_task.cancel()
        try:
            await _heartbeat_task
        except asyncio.CancelledError:
            pass
        logger.info("🛑 post_shutdown: heartbeat task cancelled")

# ============ /start ============
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if os.getenv("MAINTENANCE_MODE") == "1":
        await update.message.reply_text("🛠 المتجر تحت الصيانة حالياً.")
        return
    if not update.message or not update.effective_user:
        return
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"

    if await is_rate_limited(user_id):
        await update.message.reply_text("⚠️ لقد تجاوزت الحد المسموح.")
        return

    user_data = await register_or_update_user(
        user_id, first_name,
        update.effective_user.last_name or "",
        update.effective_user.username or ""
    )

    keyboard = [[InlineKeyboardButton("🛍 افتح المتجر", web_app=WebAppInfo(url=get_miniapp_url()))]]
    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    if user_data:
        vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}" if user_data.get('vip_level', 0) > 0 else ""
        balance = user_data.get('balance', 0)
        await update.message.reply_text(
            f"مرحباً {html.escape(str(first_name)) if first_name else ''}{vip_text} 👋\n\n💰 رصيدك: {balance:.2f}$\n\nأهلاً بك في متجر SANAD PLUS⁺\nاختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )
    else:
        await notify_admins_async(f"⚠️ فشل تسجيل مستخدم - ID: {user_id}", important=True, use_markdown=False)
        await update.message.reply_text(f"مرحباً {html.escape(str(first_name)) if first_name else ''} 👋\n\nأهلاً بك في متجر SANAD PLUS⁺", reply_markup=reply_markup)

# ============ /me ============
async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.effective_user:
        return
    user_id = update.effective_user.id
    if await is_rate_limited(user_id):
        await update.message.reply_text("⚠️ يرجى المحاولة بعد قليل.")
        return

    user_data = await register_or_update_user(
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
            f"👤 معلوماتك:\n━━━━━━━━━━━━━━━\n"
            f"الاسم: {user_data.get('first_name', '')} {user_data.get('last_name', '')}\n"
            f"Telegram ID: `{user_id}`\n"
            f"الرصيد: {balance:.2f}$\n"
            f"الحالة KYC: {kyc_status}\n"
            f"مستوى VIP: {user_data.get('vip_level', 0)}{vip_text}\n"
        )
        await update.message.reply_text(message, parse_mode="HTML")
    else:
        await update.message.reply_text("تعذر جلب معلوماتك. حاول لاحقاً.")

# ============ /admin_info ============
async def admin_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS:
        await notify_admins_async(f"🚫 محاولة وصول غير مصرح بها - ID: {user_id}", important=True, use_markdown=False)
        await update.message.reply_text("⛔️ غير مصرح.")
        return

    info = (
        f"📊 **معلومات النظام**\n━━━━━━━━━━━━━━━\n"
        f"🤖 **البوت: يعمل** ({BOT_VERSION})\n"
        f"📦 إصدار MiniApp: v{MINIAPP_VERSION}\n"
        f"🔗 MiniApp URL: {get_miniapp_url()}\n"
        f"🖥 Backend: {BACKEND_URL}\n"
        f"👥 عدد الأدمن: {len(ADMIN_IDS)}\n"
        f"🛡 Sentry: {'✅ نشط' if _SENTRY_AVAILABLE else '❌ غير متوفر'}\n"
        f"💓 Heartbeat: كل 60s → Redis\n"
    )
    await update.message.reply_text(info, parse_mode="HTML")

# ============ Error Handler ============
async def _should_notify_error(exc: Exception) -> bool:
    error_type = type(exc).__name__[:40]
    key = f"bot:error_notified:{error_type}"
    try:
        if redis_client:
            result = await asyncio.to_thread(
                redis_client.set, key, "1", ex=60, nx=True
            )
            return result is not None
        return True
    except Exception:
        return True

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    error_str = str(context.error)
    if "Conflict" in error_str or "terminated by other getUpdates" in error_str:
        return

    logger.error(f"❌ خطأ في البوت: {context.error}")
    if _SENTRY_AVAILABLE:
        try: sentry_sdk.capture_exception(context.error)
        except Exception: pass

    if context.error:
        should = await _should_notify_error(context.error)
        if should:
            try:
                await notify_admins_async(
                    f"❌ خطأ في البوت\n{str(context.error)[:300]}",
                    important=True,
                    use_markdown=False,
                )
            except Exception: pass

# ============ App Setup ============
def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود")

    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .concurrent_updates(32)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    application.add_handler(CommandHandler("admin_info", admin_info))
    application.add_error_handler(error_handler)
    return application

def run_polling():
    application = create_application()
    logger.info(f"🚀 بدء تشغيل البوت {BOT_VERSION}")
    _notify_admins_at_startup(f"✅ البوت بدأ العمل ({BOT_VERSION})\nMiniApp v{MINIAPP_VERSION}\nSentry: {'✅' if _SENTRY_AVAILABLE else '❌'}")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    run_polling()
