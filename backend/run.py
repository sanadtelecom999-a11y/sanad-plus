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
        columns_to_add = {
            'deposits': [
                ('admin_note', 'TEXT'),
            ],
            'kyc_requests': [
                ('admin_note', 'TEXT'),
            ],
            # أضف أي أعمدة أخرى تحتاجها لاحقاً
        }
        inspector = sa.inspect(db.engine)
        for table, cols in columns_to_add.items():
            if not inspector.has_table(table):
                continue
            existing_cols = [col['name'] for col in inspector.get_columns(table)]
            for col_name, col_type in cols:
                if col_name not in existing_cols:
                    db.session.execute(sa.text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}'))
        db.session.commit()

def run_bot_thread():
    from bot.bot import run_polling
    run_polling()

if __name__ == "__main__":
    # ترقية قاعدة البيانات أولاً
    upgrade_database()

    # تشغيل البوت في خيط منفصل
    bot_thread = threading.Thread(target=run_bot_thread, daemon=True)
    bot_thread.start()

    # تشغيل Flask
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
