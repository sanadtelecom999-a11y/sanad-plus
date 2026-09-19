from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import Config
from .extensions import db, jwt
from .models.base import (
    User, Category, Product, ProductBundle, Order, Deposit,
    PaymentMethod, KYCRequest, Notification, Transaction,
    Setting, AdminActivity, ServiceRequest,
    Coupon, CouponUsage, Referral, FinancialAuditLog,
    AdminOTPSession, JWTBlacklist
)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["500 per hour", "100 per minute"],
    storage_uri="memory://",
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

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

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        try:
            blacklisted = JWTBlacklist.query.filter_by(jti=jti).first()
            return blacklisted is not None
        except Exception as e:
            print(f"token check error: {e}")
            return False

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "تم تسجيل الخروج، يرجى تسجيل الدخول مجدداً",
            "code": "TOKEN_REVOKED"
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "انتهت صلاحية الجلسة",
            "code": "TOKEN_EXPIRED"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "توكن غير صالح",
            "code": "TOKEN_INVALID"
        }), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "يجب تسجيل الدخول",
            "code": "TOKEN_MISSING"
        }), 401

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "محاولات كثيرة جداً — يرجى المحاولة لاحقاً",
            "code": "RATE_LIMITED",
            "retry_after": str(e.description)
        }), 429

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app
