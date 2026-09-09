from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .models.base import User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod, KYCRequest, Notification, Transaction, Setting, Admin, AdminActivity, ServiceRequest

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    jwt.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        # إعادة إنشاء الجداول مع الحقول الجديدة (للتطوير فقط)
        db.drop_all()
        db.create_all()

    return app
