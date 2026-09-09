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
    """إضافة الأعمدة المفقودة إلى الجداول تلقائياً دون حذف البيانات"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        # قائمة الجداول والأعمدة المطلوبة
        required_columns = {
            'deposits': {
                'admin_note': 'TEXT',
            },
            'kyc_requests': {
                'admin_note': 'TEXT',
                'address': 'VARCHAR(255)',
                'selfie_image': 'TEXT',
            },
            # أضف أي جدول وعمود آخر هنا إذا لزم
        }

        for table_name, columns in required_columns.items():
            if not inspector.has_table(table_name):
                continue
            existing_cols = [col['name'] for col in inspector.get_columns(table_name)]
            for col_name, col_type in columns.items():
                if col_name not in existing_cols:
                    try:
                        db.session.execute(
                            sa.text(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
                        )
                        print(f"✔️ تمت إضافة العمود {col_name} إلى جدول {table_name}")
                    except Exception as e:
                        print(f"⚠️ فشل إضافة {col_name} إلى {table_name}: {e}")
        db.session.commit()
        print("✅ اكتملت ترقية قاعدة البيانات")

def run_flask():
    """تشغيل Flask في خيط منفصل"""
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    # ترقية قاعدة البيانات أولاً
    upgrade_database()

    # تشغيل Flask في خيط منفصل
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # تشغيل البوت في الخيط الرئيسي (حتى يعمل Polling بشكل صحيح)
    from bot.bot import run_polling
    run_polling()
