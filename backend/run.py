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
    """ترقية قاعدة البيانات: FK، أعمدة، وأنواع البيانات"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        # 1) إزالة FK من admin_activities
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
                print(f"⚠️ فشل: {sql[:70]}... → {e}")

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
                        print(f"⚠️ فشل تحويل {table}.{col}: {e}")

        # 3) إضافة الأعمدة المفقودة
        required_columns = {
            'deposits': {'admin_note': 'TEXT'},
            'kyc_requests': {'address': 'VARCHAR(255)', 'selfie_image': 'TEXT'},
            'payment_methods': {'account_name': 'VARCHAR(100)', 'qr_image': 'TEXT'},
            'users': {
                'referral_earnings': 'FLOAT DEFAULT 0',
                'referral_count': 'INTEGER DEFAULT 0',
            },
            'products': {
                'rating_sum': 'INTEGER DEFAULT 0',
                'rating_count': 'INTEGER DEFAULT 0',
                'max_quantity': 'INTEGER DEFAULT 0',
            },
            'orders': {
                'discount_amount': 'FLOAT DEFAULT 0',
                'coupon_code': 'VARCHAR(50)',
                'is_rated': 'BOOLEAN DEFAULT FALSE',
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
                        print(f"⚠️ فشل إضافة {table}.{col_name}: {e}")

        # 4) إنشاء الجداول الجديدة
        try:
            db.create_all()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ فشل إنشاء الجداول: {e}")

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