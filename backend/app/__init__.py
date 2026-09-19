# ============================================================
# 🚀 SANAD PLUS⁺ — App Initialization (v2.2)
# ============================================================
import os
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

# ============================================================
# 🔴 Redis Rate Limiting (مع fallback آمن)
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_RATE_LIMIT_STORAGE = _REDIS_URL if _REDIS_URL else "memory://"

# تنبيه في السجلات
if _REDIS_URL:
    print(f"✅ Rate Limiter: Redis ({_REDIS_URL.split('@')[-1] if '@' in _REDIS_URL else 'configured'})")
else:
    print("⚠️ Rate Limiter: memory:// (لا يوجد REDIS_URL)")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["500 per hour", "100 per minute"],
    storage_uri=_RATE_LIMIT_STORAGE,
    storage_options={
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
    } if _REDIS_URL else {},
    strategy="fixed-window",       # أو "moving-window" لـ دقة أعلى
    headers_enabled=True,          # يعرض X-RateLimit-* في الرد
    swallow_errors=True,           # لا يُعطّل التطبيق لو Redis سقط
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ============================================================
    # 🌐 CORS
    # ============================================================
    CORS(
        app,
        resources={
            r"/api/*": {"origins": Config.ALLOWED_ORIGINS},
            r"/admin/*": {"origins": Config.ALLOWED_ORIGINS},
        },
        supports_credentials=False,
    )

    # ============================================================
    # 🔌 Extensions
    # ============================================================
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    # ============================================================
    # 🔐 JWT Callbacks
    # ============================================================
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

    # ============================================================
    # 🚨 Error Handlers
    # ============================================================
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "محاولات كثيرة جداً — يرجى المحاولة لاحقاً",
            "code": "RATE_LIMITED",
            "retry_after": str(e.description)
        }), 429

    # ============================================================
    # 🛣️ Blueprint
    # ============================================================
    from .routes import main
    app.register_blueprint(main)

    # ============================================================
    # ⚠️ ملاحظة (v2.2):
    #    db.create_all() في run.py (وليس هنا)
    # ============================================================

    return app