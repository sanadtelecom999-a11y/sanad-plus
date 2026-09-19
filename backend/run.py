# ============================================================
# 🛡️ Sentry — يجب أن يكون أول شيء قبل أي استيراد آخر
# ============================================================
import os
import sys
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.2,       # 20% من الطلبات (لتوفير الحصة)
    profiles_sample_rate=0.0,     # معطّل
    send_default_pii=False,       # لا نرسل بيانات شخصية
    environment=os.getenv("SENTRY_ENV", "production"),
    release=os.getenv("RELEASE_VERSION", "v2.1"),
)

# ============================================================
# ⬇️ باقي الاستيرادات
# ============================================================
import threading
import sqlalchemy as sa
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

app = create_app()


def upgrade_database():
    """ترقية قاعدة البيانات — v2.1"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        print("بدء Migration v2.1...")

        # 1) FK removals قديمة
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

        # 2) Image columns → TEXT
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

        # 3) Soft Delete
        soft_delete_tables = ['categories', 'products', 'coupons', 'payment_methods']
        for table in soft_delete_tables:
            if inspector.has_table(table):
                try:
                    db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        print("Soft Delete columns")

        # 4) Users
        if inspector.has_table('users'):
            users_cols = [
                'updated_at TIMESTAMP DEFAULT NOW()',
                'referred_by_id INTEGER',
                'allow_negative_balance BOOLEAN DEFAULT TRUE',
                'max_negative_balance FLOAT DEFAULT 0',
                'referral_earnings FLOAT DEFAULT 0',
                'referral_count INTEGER DEFAULT 0',
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

        # 5) Categories: order → display_order
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

        # 6) Products
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

        # 7) Orders
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

        # 8) Deposits
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

        # 9) KYC
        if inspector.has_table('kyc_requests'):
            try:
                db.session.execute(text('ALTER TABLE kyc_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 10) Coupon Usages
        if inspector.has_table('coupon_usages'):
            try:
                db.session.execute(text('ALTER TABLE coupon_usages ADD COLUMN IF NOT EXISTS discount_applied FLOAT DEFAULT 0'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 11) Service Requests
        if inspector.has_table('service_requests'):
            try:
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS admin_id INTEGER'))
                db.session.commit()
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 12) Drop admins table
        if inspector.has_table('admins'):
            try:
                db.session.execute(text('DROP TABLE admins CASCADE'))
                db.session.commit()
                print("Dropped admins table")
            except Exception as e:
                db.session.rollback()
                print(f"drop admins: {e}")

        # 13) Create new tables
        try:
            db.create_all()
            db.session.commit()
            print("New tables created")
        except Exception as e:
            db.session.rollback()
            print(f"create_all: {e}")

        # 14) Indexes
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
        ]
        for idx_sql in indexes:
            try:
                db.session.execute(text(idx_sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 15) Coupon UNIQUE constraint
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

        print("اكتملت ترقية قاعدة البيانات (v2.1)")


def run_flask():
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    upgrade_database()
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    from bot.bot import run_polling
    run_polling()