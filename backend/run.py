import os
import sys
import threading
import sqlalchemy as sa

# إضافة جذر المشروع للمسار
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

app = create_app()

def upgrade_database():
    """تحويل أعمدة الصور إلى TEXT وإضافة الأعمدة المفقودة"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        # تحويل حقول الصور من VARCHAR إلى TEXT
        image_columns = {
            'categories': ['image'],
            'products': ['image'],
            'payment_methods': ['icon'],
            'deposits': ['proof_image'],
            'kyc_requests': ['selfie_image'],
        }

        for table, cols in image_columns.items():
            if not inspector.has_table(table):
                continue
            existing_cols = {col['name']: col['type'] for col in inspector.get_columns(table)}
            for col in cols:
                if col in existing_cols:
                    col_type = str(existing_cols[col]).upper()
                    if 'VARCHAR' in col_type or 'CHAR' in col_type:
                        try:
                            db.session.execute(sa.text(f'ALTER TABLE {table} ALTER COLUMN {col} TYPE TEXT'))
                            db.session.commit()
                            print(f"✔️ تم تحويل {table}.{col} إلى TEXT")
                        except Exception as e:
                            print(f"⚠️ فشل تحويل {table}.{col}: {e}")

        # إضافة الأعمدة المفقودة
        required_columns = {
            'deposits': {'admin_note': 'TEXT'},
            'kyc_requests': {'address': 'VARCHAR(255)', 'selfie_image': 'TEXT'},
        }

        for table, cols in required_columns.items():
            if not inspector.has_table(table):
                continue
            existing_cols = [col['name'] for col in inspector.get_columns(table)]
            for col_name, col_type in cols.items():
                if col_name not in existing_cols:
                    try:
                        db.session.execute(sa.text(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}'))
                        db.session.commit()
                        print(f"✔️ تمت إضافة {col_name} إلى {table}")
                    except Exception as e:
                        print(f"⚠️ فشل إضافة {col_name} إلى {table}: {e}")

        print("✅ اكتملت ترقية قاعدة البيانات")

def run_flask():
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    upgrade_database()

    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    from bot.bot import run_polling
    run_polling()
