from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .models.base import User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod, KYCRequest, Notification, Transaction, Setting, Admin, AdminActivity, ServiceRequest

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # تفعيل CORS للسماح بالاتصال من أي مصدر
    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    jwt.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        # إنشاء الجداول إذا لم تكن موجودة
        db.create_all()

        # محاولة إضافة الأعمدة الجديدة إذا لم تكن موجودة (تحديث آمن)
        try:
            db.session.execute('ALTER TABLE deposits ADD COLUMN IF NOT EXISTS admin_note TEXT')
            db.session.commit()
        except Exception as e:
            print(f"تحديث قاعدة البيانات: {e}")

    return app
