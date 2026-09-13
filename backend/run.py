import os
import sys
import threading
import sqlalchemy as sa
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

app = create_app()


def upgrade_database():
    """ترقية قاعدة البيانات"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        # 1) إزالة FK
        fk_removals = [
            "ALTER TABLE admin_activities DROP CONSTRAINT IF EXISTS admin_activities_admin_id_fkey",
            "ALTER TABLE admin_activities ALTER COLUMN admin_id DROP NOT NULL",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey",
        ]
        for sql in fk_removals:
            try:
                db.session.execute(text(sql))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"⚠️ فشل: {sql[:70]}...")

        # 2) تحويل حقول الصور إلى TEXT
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
                    except Exception as e:
                        db.session.rollback()

        # 3) إضافة الأعمدة المفقودة
        required_columns = {
            'deposits': {'admin_note': 'TEXT'},
            'kyc_requests': {'address': 'VARCHAR(255)', 'selfie_image': 'TEXT'},
            'payment_methods': {'account_name': 'VARCHAR(100)', 'qr_image': 'TEXT', 'requires_kyc': 'BOOLEAN DEFAULT FALSE'},
            'users': {
                'referral_earnings': 'FLOAT DEFAULT 0',
                'referral_count': 'INTEGER DEFAULT 0',
                # 🆕 الرصيد السالب
                'allow_negative_balance': 'BOOLEAN DEFAULT TRUE',
                'max_negative_balance': 'FLOAT DEFAULT 0',
            },
            'products': {
                'max_quantity': 'INTEGER DEFAULT 0',
            },
            'orders': {
                'discount_amount': 'FLOAT DEFAULT 0',
                'coupon_code': 'VARCHAR(50)',
            },
        }
        for table, cols in required_columns.items():
            if not inspector.has_table(table):
                continue
            existing_cols = [col['name'] for col in inspector.get_columns(table)]
            for col_name, col_type in cols.items():
                if col_name not in existing_cols:
                    try:
                        db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}'))
                        db.session.commit()
                        print(f"✅ تمت إضافة {col_name} إلى {table}")
                    except Exception as e:
                        db.session.rollback()
                        print(f"⚠️ فشل إضافة {table}.{col_name}")

        # 4) تنظيف coupon_usages المكرر
        if inspector.has_table('coupon_usages'):
            try:
                dup_sql = """
                DELETE FROM coupon_usages a
                USING coupon_usages b
                WHERE a.id > b.id
                  AND a.coupon_id = b.coupon_id
                  AND a.user_id = b.user_id
                """
                db.session.execute(text(dup_sql))
                db.session.commit()
            except Exception as e:
                db.session.rollback()

        # 5) UNIQUE constraint
        if inspector.has_table('coupon_usages'):
            try:
                unique_sql = """
                ALTER TABLE coupon_usages
                ADD CONSTRAINT uq_coupon_user UNIQUE (coupon_id, user_id)
                """
                db.session.execute(text(unique_sql))
                db.session.commit()
                print("✅ تمت إضافة UNIQUE على coupon_usages")
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    print(f"⚠️ فشل إضافة UNIQUE")

        # 6) Indexes
        indexes = [
            ("CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)"),
            ("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)"),
            ("CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status)"),
            ("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)"),
            ("CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC)"),
            ("CREATE INDEX IF NOT EXISTS idx_audit_user_created ON financial_audit_log(user_id, created_at DESC)"),
        ]
        for idx_sql in indexes:
            try:
                db.session.execute(text(idx_sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 7) إنشاء الجداول الجديدة
        try:
            db.create_all()
            db.session.commit()
        except Exception as e:
            db.session.rollback()

        print("🎉 اكتملت ترقية قاعدة البيانات")


def run_flask():
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    upgrade_database()
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    from bot.bot import run_polling
    run_polling()