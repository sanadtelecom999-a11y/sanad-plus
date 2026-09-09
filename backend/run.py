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
    """إصلاح جدول kyc_requests عن طريق حذفه وإعادة إنشائه"""
    with app.app_context():
        inspector = sa.inspect(db.engine)

        # 1) حذف جدول kyc_requests إذا كان موجودًا
        if inspector.has_table('kyc_requests'):
            try:
                db.session.execute(sa.text('DROP TABLE kyc_requests CASCADE'))
                db.session.commit()
                print("🗑️ تم حذف جدول kyc_requests القديم")
            except Exception as e:
                print(f"⚠️ فشل حذف جدول kyc_requests: {e}")

        # 2) إنشاء جدول kyc_requests من جديد حسب النموذج الحالي
        try:
            from app.models.base import KYCRequest
            KYCRequest.__table__.create(db.session.bind, checkfirst=True)
            db.session.commit()
            print("✅ تم إنشاء جدول kyc_requests الجديد")
        except Exception as e:
            print(f"⚠️ فشل إنشاء جدول kyc_requests: {e}")

        # 3) إضافة عمود admin_note إلى deposits إذا لم يكن موجودًا
        if inspector.has_table('deposits'):
            existing_cols = [col['name'] for col in inspector.get_columns('deposits')]
            if 'admin_note' not in existing_cols:
                try:
                    db.session.execute(sa.text('ALTER TABLE deposits ADD COLUMN admin_note TEXT'))
                    db.session.commit()
                    print("✔️ تمت إضافة عمود admin_note إلى deposits")
                except Exception as e:
                    print(f"⚠️ فشل إضافة admin_note إلى deposits: {e}")

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
