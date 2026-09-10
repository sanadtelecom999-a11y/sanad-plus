from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .models.base import (
    User, Category, Product, ProductBundle, Order, Deposit,
    PaymentMethod, KYCRequest, Notification, Transaction,
    Setting, Admin, AdminActivity, ServiceRequest,
    Coupon, CouponUsage, Referral
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ============ 🌐 CORS مُقيّد ============
    CORS(
        app,
        resources={
            r"/api/*": {"origins": Config.ALLOWED_ORIGINS},
            r"/admin/*": {"origins": Config.ALLOWED_ORIGINS},
        },
        supports_credentials=False,
    )

    db.init_app(app)
    jwt.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()
        # ملاحظة: باقي الـ migrations تُنفّذ في run.py

    return app