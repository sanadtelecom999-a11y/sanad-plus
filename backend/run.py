# ============================================================
# 🛡️ Sentry
# ============================================================
import os
import re
import sys
import time
import atexit
import logging
import threading
import subprocess
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

# --- Redaction: منع تسريب BOT_TOKEN في Sentry (AUD-M-005) ---
_BOT_TOKEN_PATTERN = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


def _sentry_redact(value):
    """Redact BOT_TOKEN-like strings from a value."""
    if isinstance(value, str):
        return _BOT_TOKEN_PATTERN.sub("bot***REDACTED***", value)
    return value


def _sentry_before_send(event, hint):
    """Redact sensitive data before sending events to Sentry."""
    if "exception" in event:
        for val in event["exception"].get("values", []):
            if "value" in val:
                val["value"] = _sentry_redact(val["value"])
    if "request" in event:
        if "url" in event["request"]:
            event["request"]["url"] = _sentry_redact(event["request"]["url"])
        if "headers" in event["request"]:
            for k, v in list(event["request"]["headers"].items()):
                event["request"]["headers"][k] = _sentry_redact(v)
    if "extra" in event:
        for k, v in list(event["extra"].items()):
            event["extra"][k] = _sentry_redact(v)
    return event


def _sentry_before_breadcrumb(breadcrumb, hint):
    """Redact sensitive data from breadcrumbs."""
    if "message" in breadcrumb:
        breadcrumb["message"] = _sentry_redact(breadcrumb["message"])
    if "data" in breadcrumb:
        for k, v in list(breadcrumb["data"].items()):
            breadcrumb["data"][k] = _sentry_redact(v)
    return breadcrumb


sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.2,
    profiles_sample_rate=0.0,
    send_default_pii=False,
    environment=os.getenv("SENTRY_ENV", "production"),
    release=os.getenv("RELEASE_VERSION", "v18"),
    before_send=_sentry_before_send,
    before_breadcrumb=_sentry_before_breadcrumb,
)

# ============================================================
# ⬇️ Imports
# ============================================================
import sqlalchemy as sa
from sqlalchemy import text
from gunicorn.app.base import BaseApplication

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sanad.run")

app = create_app()


# ============================================================
# ✅ create_all (idempotent)
# ============================================================
with app.app_context():
    try:
        db.create_all()
        print("✅ الجداول جاهزة")
    except Exception as e:
        print(f"⚠️ create_all: {e}")


# ============================================================
# v2.4: تصفير allow_negative_balance للمستخدمين الحاليين
# ============================================================
def _fix_negative_balance_defaults():
    """تصفير allow_negative_balance للمستخدمين بدون حد سلبي فعلي"""
    try:
        result = db.session.execute(text("""
            UPDATE users 
            SET allow_negative_balance = FALSE 
            WHERE max_negative_balance <= 0 
              AND allow_negative_balance = TRUE
        """))
        db.session.commit()
        if result.rowcount:
            logger.info(f"✅ Fixed negative balance defaults: {result.rowcount} users")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Negative balance fix failed: {e}")


# ============================================================
# 🆕 v17: Migration للخصومات
# ============================================================
def _apply_discount_migration():
    """إضافة users.general_discount + جدول user_product_discounts"""
    try:
        db.session.execute(text(
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS general_discount FLOAT DEFAULT 0.0'
        ))
        db.session.commit()
        logger.info("✅ users.general_discount ready")
    except Exception as e:
        db.session.rollback()
        logger.error(f"general_discount migration failed: {e}")

    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_product_discounts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                discount_percent FLOAT NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT uq_user_product_discount UNIQUE (user_id, product_id)
            )
        """))
        db.session.commit()
        logger.info("✅ user_product_discounts table ready")
    except Exception as e:
        db.session.rollback()
        logger.error(f"user_product_discounts migration failed: {e}")


# ============================================================
# 🗄️ Migration (v2.1 + v17)
# ============================================================

def _start_bot_subprocess():
    """يشغل البوت مرة واحدة (legacy — يستخدمه supervisor داخلياً)"""
    global _bot_process

    bot_script = os.path.join(os.path.dirname(__file__), "bot_main.py")

    if not os.path.exists(bot_script):
        logger.error(f"❌ bot_main.py not found: {bot_script}")
        return None

    try:
        _bot_process = subprocess.Popen(
            [sys.executable, "-u", bot_script],
            stdout=sys.stdout,
            stderr=sys.stderr,
            env=os.environ.copy(),
        )
        logger.info(f"🤖 Bot subprocess started (PID: {_bot_process.pid})")
        return _bot_process
    except Exception as e:
        logger.error(f"❌ Failed to start bot subprocess: {e}")
        return None


_shutdown_event = threading.Event()

def _stop_bot_subprocess():
    global _shutdown_event
    """إيقاف نظيف للبوت"""
    global _bot_process

    _shutdown_event.set()

    if _bot_process is None:
        return
    if _bot_process.poll() is not None:
        return

    logger.info("🛑 Terminating bot subprocess...")
    try:
        _bot_process.terminate()
        try:
            _bot_process.wait(timeout=10)
            logger.info("✅ Bot subprocess terminated gracefully")
        except subprocess.TimeoutExpired:
            logger.warning("⚠️ Bot didn't stop in 10s, killing...")
            _bot_process.kill()
            try:
                _bot_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
    except Exception as e:
        logger.error(f"❌ Error stopping bot: {e}")


def _bot_supervisor():
    """
    🆕 v18: يشغّل البوت ويراقبه — يعيد التشغيل عند crash.
    يعمل في daemon thread داخل Gunicorn worker.
    """
    global _bot_process

    bot_script = os.path.join(os.path.dirname(__file__), "bot_main.py")

    if not os.path.exists(bot_script):
        logger.error(f"❌ bot_main.py not found: {bot_script}")
        return

    restart_count = 0

    while not _shutdown_event.is_set():
        try:
            _bot_process = subprocess.Popen(
                [sys.executable, "-u", bot_script],
                stdout=sys.stdout,
                stderr=sys.stderr,
                env=os.environ.copy(),
            )
            logger.info(f"🤖 Bot started (PID: {_bot_process.pid}, restarts: {restart_count})")

            # انتظر انتهاء العملية
            _bot_process.wait()

            if _shutdown_event.is_set():
                logger.info("🛑 Shutdown requested — supervisor stopping")
                break

            exit_code = _bot_process.returncode
            if exit_code == 0:
                logger.info("🤖 Bot exited cleanly — supervisor stopping")
                break

            restart_count += 1
            logger.warning(f"⚠️ Bot crashed (code={exit_code}), restart #{restart_count} in 5s")

            # 🆕 v18: Sentry alert
            try:
                import sentry_sdk
                sentry_sdk.capture_message(
                    f"Bot crashed (code={exit_code}), restart #{restart_count}",
                    level="warning"
                )
            except Exception:
                pass

            # انتظر 5 ثوان قبل الإعادة (لكن احترم shutdown)
            if _shutdown_event.wait(timeout=5):
                break

        except Exception as e:
            logger.error(f"Supervisor error: {e}")
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass
            if _shutdown_event.wait(timeout=10):
                break


def post_fork(server, worker):
    """
    🆕 v18: يشغل supervisor thread بدلاً من bot subprocess مباشرة.
    """
    logger.info("🔧 post_fork hook running...")

    supervisor_thread = threading.Thread(
        target=_bot_supervisor,
        name="bot-supervisor",
        daemon=True,
    )
    supervisor_thread.start()
    logger.info("🛡️ Bot supervisor thread started")

    atexit.register(_stop_bot_subprocess)


# ============================================================
# 🌐 Gunicorn Standalone Application
# ============================================================
class StandaloneApplication(BaseApplication):
    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        for key, value in self.options.items():
            if key in self.cfg.settings and value is not None:
                self.cfg.set(key.lower(), value)

    def load(self):
        return self.application


# ============================================================
# 🚀 Main Entry Point
# ============================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    

    options = {
        "bind": f"0.0.0.0:{port}",
        "workers": 1,
        "threads": 4,
        "worker_class": "gthread",
        "timeout": 120,
        "graceful_timeout": 30,
        "keepalive": 5,
        "accesslog": "-",
        "errorlog": "-",
        "loglevel": "info",
        "preload_app": False,
        "post_fork": post_fork,
    }

    logger.info(f"🚀 Starting Gunicorn on port {port}")
    logger.info(f"   workers=1, threads=4, worker_class=gthread")
    logger.info(f"   Bot supervisor: enabled (v18)")

    StandaloneApplication(app, options).run()