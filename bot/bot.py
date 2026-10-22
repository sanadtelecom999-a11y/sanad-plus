import os
import logging
import asyncio
import time
from datetime import datetime, timezone
import httpx
import redis
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# ============================================================
# 🛡️ 1. إعدادات النظام (Config & Sentry)
# ============================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")
REDIS_URL = os.getenv("REDIS_URL", "")
MAINTENANCE_MODE = os.getenv("MAINTENANCE_MODE", "0")
TELEGRAM_ADMIN_IDS = os.getenv("TELEGRAM_ADMIN_IDS", "")
BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")

ADMIN_IDS = [int(x.strip()) for x in TELEGRAM_ADMIN_IDS.split(",") if x.strip()]
BOT_VERSION = "v18.5.0"
MINIAPP_VERSION = "22"

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

_SENTRY_AVAILABLE = False
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
        _SENTRY_AVAILABLE = True
    except ImportError:
        pass

# ============================================================
# 🔗 2. التكامل مع الـ Backend
# ============================================================
def get_miniapp_url():
    return f"{BACKEND_URL}/?v={MINIAPP_VERSION}"

def notify_admins_sync(message: str):
    """إرسال إشعار للمالكين بشكل متزامن عبر HTTP"""
    if not BOT_TOKEN or not ADMIN_IDS:
        return
    import requests
    for admin_id in ADMIN_IDS:
        try:
            requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": admin_id, "text": message},
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")

# ============================================================
# 🛡️ 3. الحماية والـ Rate Limiting (SRE Fixes)
# ============================================================
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    redis_client = None

_mem_rate_limits = {}

def _mem_rate_limit(user_id, limit=15):
    """Fallback صارم في الذاكرة عند سقوط Redis"""
    now = time.time()
    if user_id not in _mem_rate_limits:
        _mem_rate_limits[user_id] = []
    _mem_rate_limits[user_id] = [t for t in _mem_rate_limits[user_id] if now - t < 60]
    if len(_mem_rate_limits[user_id]) >= limit:
        return False
    _mem_rate_limits[user_id].append(now)
    return True

def rate_limit_decorator(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id
        try:
            if redis_client:
                # استخدام Pipeline لضمان الذرية ومنع الانهيار
                pipe = redis_client.pipeline()
                key = f"ratelimit:bot:{user_id}"
                pipe.incr(key)
                pipe.expire(key, 60, nx=True)
                results = pipe.execute()
                redis_count = results[0]
                mem_count = len(_mem_rate_limits.get(user_id, []))
                if max(redis_count, mem_count) > 10:
                    await update.effective_message.reply_text("⚠️ تجاوزت الحد المسموح، يرجى الانتظار دقيقة.")
                    return
            else:
                if not _mem_rate_limit(user_id, limit=15):
                    await update.effective_message.reply_text("⚠️ الخدمة تحت الضغط (Fallback)، حاول لاحقاً.")
                    return
        except Exception:
            if not _mem_rate_limit(user_id, limit=15):
                await update.effective_message.reply_text("⚠️ الخدمة تحت الضغط (Fallback)، حاول لاحقاً.")
                return
        return await func(update, context, *args, **kwargs)
    return wrapper

def _should_notify_error(exc: Exception) -> bool:
    """حماية من إغراق المطور بالرسائل"""
    error_type = type(exc).__name__[:40]
    try:
        if redis_client:
            key = f"bot:error_notified:{error_type}"
            return redis_client.set(key, "1", ex=60, nx=True) is not None
        return True
    except Exception:
        return True

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error(msg="Exception while handling an update:", exc_info=context.error)
    if _should_notify_error(context.error):
        logger.warning("Sentry notified about a new error type.")

# ============================================================
# 📱 4. أوامر البوت (Handlers)
# ============================================================
@rate_limit_decorator
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if MAINTENANCE_MODE == "1":
        await update.effective_message.reply_text("🛠️ المتجر تحت الصيانة حالياً. سنعود قريباً جداً!")
        return
    
    keyboard = [[InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=get_miniapp_url()))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.effective_message.reply_text(
        "أهلاً بك في متجر SANAD PLUS⁺ 🎮\nرصيدك الحالي: يرجى فتح المتجر للتحقق.\nاضغط الزر أدناه لبدء التسوق:",
        reply_markup=reply_markup
    )

@rate_limit_decorator
async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{BACKEND_URL}/api/bot/auth",
                headers={"X-Bot-Token": BOT_API_SECRET},
                json={"telegram_id": user.id, "first_name": user.first_name}
            )
            if res.status_code == 200:
                data = res.json()
                msg = f"👤 حسابك:\n🆔 المعرف: {data.get('id')}\n💰 الرصيد: {data.get('balance')}$\n📊 المستوى: {data.get('vip_level')}\n✅ التوثيق: {data.get('kyc_status')}"
                await update.message.reply_text(msg)
            else:
                await update.message.reply_text("⚠️ الخدمة غير متاحة حالياً، حاول لاحقاً.")
    except Exception:
        await update.message.reply_text("⚠️ تعذر الاتصال بالخادم.")

@rate_limit_decorator
async def admin_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        return
    await update.message.reply_text(f"⚙️ حالة النظام:\nالإصدار: {BOT_VERSION}\nحالة البوت: يعمل بنجاح ✅")

# ============================================================
# 💓 5. النبضة والمراقبة (Heartbeat & Monitoring)
# ============================================================
async def heartbeat_loop(app):
    while True:
        try:
            if redis_client:
                # to_thread لمنع حجب الـ Event Loop
                await asyncio.to_thread(redis_client.setex, "bot:heartbeat", 180, int(time.time()))
            
            # تنظيف ذاكرة الـ Rate Limit
            now = time.time()
            for uid in list(_mem_rate_limits.keys()):
                _mem_rate_limits[uid] = [t for t in _mem_rate_limits[uid] if now - t < 60]
                if not _mem_rate_limits[uid]:
                    del _mem_rate_limits[uid]
        except Exception as e:
            logger.warning(f"heartbeat failed (will retry): {e}")
        await asyncio.sleep(60)

async def post_init(app: Application):
    logger.info("🚀 post_init: starting heartbeat loop")
    asyncio.create_task(heartbeat_loop(app))

async def post_shutdown(app: Application):
    logger.info("🛑 post_shutdown: cleaning up")
    if redis_client:
        try:
            redis_client.delete("bot:heartbeat")
        except: pass

# ============================================================
# ⚙️ 6. التهيئة والتشغيل (App Setup)
# ============================================================
def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في متغيرات البيئة")

    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .concurrent_updates(32) # منع إشباع الـ Pool
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
    logger.info(f"🚀 بدء تشغيل البوت {BOT_VERSION} — MiniApp Version: {MINIAPP_VERSION}")
    logger.info(f"🔗 MiniApp URL: {get_miniapp_url()}")
    logger.info(f"👥 عدد الأدمن: {len(ADMIN_IDS)}")
    logger.info(f"🛡 Sentry: {'✅' if _SENTRY_AVAILABLE else '❌'}")
    logger.info(f"💓 Heartbeat loop: سيبدأ خلال 5s")

    notify_admins_sync(
        f"✅ البوت بدأ العمل ({BOT_VERSION})\n"
        f"MiniApp v{MINIAPP_VERSION}\n"
        f"Sentry: {'✅' if _SENTRY_AVAILABLE else '❌'}"
    )

    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    run_polling()
