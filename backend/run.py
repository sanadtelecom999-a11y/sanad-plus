# ============================================================
# 🛡️ Sentry
# ============================================================
import os
import sys
import time
import atexit
import logging
import threading
import subprocess
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.2,
    profiles_sample_rate=0.0,
    send_default_pii=False,
    environment=os.getenv("SENTRY_ENV", "production"),
    release=os.getenv("RELEASE_VERSION", "v18"),
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
def upgrade_database():
    """ترقية قاعدة البيانات — v2.1 + v17"""
    with app.app_context():
        inspector = sa.inspect(db.engine)
        print("بدء Migration v2.1...")

        fk_removals = [
            "ALTER TABLE admin_activities DROP CONSTRAINT IF EXISTS admin_activities_admin_id_fkey",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey",
        ]
        for sql in fk_removals:
            try:
                db.session.execute(text(sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        image_columns = {
            'categories': ['image'],
            'products': ['image'],
            'payment_methods': ['icon', 'qr_image'],
            'deposits': ['proof_image'],
            'kyc_requests': ['selfie_image'],
        }
        for table, cols in image_columns.items():
            if not inspector.has_table(table):
                continue
            existing_cols = {col['name']: str(col['type']).upper() for col in inspector.get_columns(table)}
            for col in cols:
                if col in existing_cols and ('VARCHAR' in existing_cols[col] or 'CHAR' in existing_cols[col]):
                    try:
                        db.session.execute(text(f'ALTER TABLE {table} ALTER COLUMN {col} TYPE TEXT'))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

        soft_delete_tables = ['categories', 'products', 'coupons', 'payment_methods']
        for table in soft_delete_tables:
            if inspector.has_table(table):
                try:
                    db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        print("Soft Delete columns")

        if inspector.has_table('users'):
            users_cols = [
                'updated_at TIMESTAMP DEFAULT NOW()',
                'referred_by_id INTEGER',
                'allow_negative_balance BOOLEAN DEFAULT FALSE',
                'max_negative_balance FLOAT DEFAULT 0',
                'referral_earnings FLOAT DEFAULT 0',
                'referral_count INTEGER DEFAULT 0',
                'general_discount FLOAT DEFAULT 0.0',
            ]
            for col in users_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('''
                    UPDATE users u
                    SET referred_by_id = (
                        SELECT id FROM users 
                        WHERE telegram_id = u.referred_by 
                        LIMIT 1
                    )
                    WHERE u.referred_by IS NOT NULL 
                      AND u.referred_by_id IS NULL
                '''))
                db.session.commit()
                print("referred_by_id migrated")
            except Exception as e:
                db.session.rollback()
                print(f"referred_by_id: {e}")

            try:
                db.session.execute(text('''
                    UPDATE users 
                    SET referred_by_id = NULL
                    WHERE referred_by_id IS NOT NULL 
                      AND referred_by_id NOT IN (SELECT id FROM users)
                '''))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT fk_users_referred_by 
                    FOREIGN KEY (referred_by_id) 
                    REFERENCES users(id) 
                    ON DELETE SET NULL
                '''))
                db.session.commit()
                print("FK referred_by_id")
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    print(f"FK: {e}")

            try:
                db.session.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT chk_users_referred_not_self 
                    CHECK (referred_by_id IS NULL OR referred_by_id != id)
                '''))
                db.session.commit()
                print("CHECK referred_by_id")
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    print(f"CHECK: {e}")

        if inspector.has_table('categories'):
            existing_cols = [col['name'] for col in inspector.get_columns('categories')]
            if 'order' in existing_cols and 'display_order' not in existing_cols:
                try:
                    db.session.execute(text('ALTER TABLE categories RENAME COLUMN "order" TO display_order'))
                    db.session.commit()
                    print("categories: order → display_order")
                except Exception as e:
                    db.session.rollback()
                    print(f"categories rename: {e}")
            elif 'display_order' not in existing_cols:
                try:
                    db.session.execute(text('ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

        if inspector.has_table('products'):
            products_cols = [
                'max_quantity INTEGER DEFAULT 0',
                "unit_name VARCHAR(50) DEFAULT 'قطعة'",
                'is_bundle BOOLEAN DEFAULT FALSE',
            ]
            for col in products_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE products ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('ALTER TABLE products ALTER COLUMN stock DROP NOT NULL'))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('UPDATE products SET stock = NULL WHERE stock = 0'))
                db.session.commit()
                print("stock=0 → NULL")
            except Exception as e:
                db.session.rollback()
                print(f"stock migration: {e}")

        if inspector.has_table('orders'):
            orders_cols = [
                'discount_amount FLOAT DEFAULT 0',
                'coupon_code VARCHAR(50)',
                'reviewed_by INTEGER',
                'can_cancel_until TIMESTAMP',
                'cancelled_at TIMESTAMP',
                'completed_at TIMESTAMP',
                'failed_at TIMESTAMP',
            ]
            for col in orders_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

        if inspector.has_table('deposits'):
            deposits_cols = [
                'admin_note TEXT',
                'method_id INTEGER',
                'idempotency_key VARCHAR(100)',
                'reviewed_by INTEGER',
                'reviewed_at TIMESTAMP',
            ]
            for col in deposits_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE deposits ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('''
                    UPDATE deposits 
                    SET method_id = CAST(method AS INTEGER)
                    WHERE method ~ '^[0-9]+$' 
                      AND method_id IS NULL
                '''))
                db.session.commit()
                print("deposits.method → method_id")
            except Exception as e:
                db.session.rollback()
                print(f"method migration: {e}")

            try:
                db.session.execute(text('''
                    ALTER TABLE deposits 
                    ADD CONSTRAINT uq_deposits_idempotency 
                    UNIQUE (idempotency_key)
                '''))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    pass

            try:
                db.session.execute(text('''
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_txid_user 
                    ON deposits(user_id, txid) 
                    WHERE txid IS NOT NULL AND txid != ''
                '''))
                db.session.commit()
                print("UNIQUE (user_id, txid)")
            except Exception as e:
                db.session.rollback()
                print(f"uq txid: {e}")

        if inspector.has_table('kyc_requests'):
            try:
                db.session.execute(text('ALTER TABLE kyc_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('coupon_usages'):
            try:
                db.session.execute(text('ALTER TABLE coupon_usages ADD COLUMN IF NOT EXISTS discount_applied FLOAT DEFAULT 0'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('service_requests'):
            try:
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS admin_id INTEGER'))
                db.session.commit()
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('admins'):
            try:
                db.session.execute(text('DROP TABLE admins CASCADE'))
                db.session.commit()
                print("Dropped admins table")
            except Exception as e:
                db.session.rollback()
                print(f"drop admins: {e}")

        try:
            db.create_all()
            db.session.commit()
            print("New tables created")
        except Exception as e:
            db.session.rollback()
            print(f"create_all: {e}")

        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)",
            "CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status)",
            "CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned)",
            "CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_requests(status)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_user_created ON financial_audit_log(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_action ON financial_audit_log(action, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_services_status ON service_requests(status)",
            "CREATE INDEX IF NOT EXISTS idx_otp_session_id ON admin_otp_sessions(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_otp_expires ON admin_otp_sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_blacklist_jti ON jwt_blacklist(jti)",
            "CREATE INDEX IF NOT EXISTS idx_upd_user ON user_product_discounts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_upd_product ON user_product_discounts(product_id)",
            "CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE deleted_at IS NULL",
            "CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(code, is_active) WHERE deleted_at IS NULL",
        ]
        for idx_sql in indexes:
            try:
                db.session.execute(text(idx_sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('coupon_usages'):
            try:
                db.session.execute(text('''
                    DELETE FROM coupon_usages a
                    USING coupon_usages b
                    WHERE a.id > b.id
                      AND a.coupon_id = b.coupon_id
                      AND a.user_id = b.user_id
                '''))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('''
                    ALTER TABLE coupon_usages
                    ADD CONSTRAINT uq_coupon_user UNIQUE (coupon_id, user_id)
                '''))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    pass

        _fix_negative_balance_defaults()
        _apply_discount_migration()

        print("اكتملت ترقية قاعدة البيانات (v2.1 + v17)")


# ============================================================
# 🤖 Bot — Subprocess + Supervisor (v18)
# ============================================================
_bot_process = None
_shutdown_event = threading.Event()


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


def _stop_bot_subprocess():
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

    upgrade_database()

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