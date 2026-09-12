from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import Config
from .extensions import db, jwt
from .models.base import (
    User, Category, Product, ProductBundle, Order, Deposit,
    PaymentMethod, KYCRequest, Notification, Transaction,
    Setting, Admin, AdminActivity, ServiceRequest,
    Coupon, CouponUsage, Referral, FinancialAuditLog
)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["500 per hour", "100 per minute"],
    storage_uri="memory://",
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
    limiter.init_app(app)

    # معالج أخطاء Rate Limit
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "محاولات كثيرة جداً — يرجى المحاولة لاحقاً",
            "retry_after": str(e.description)
        }), 429

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app