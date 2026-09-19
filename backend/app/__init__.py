# ============================================================
# 🚀 SANAD PLUS⁺ — App Initialization (v2.2.1)
# ============================================================
import os
from flask import Flask, jsonify, request
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
# 🌐 استخراج IP الحقيقي (Cloudflare + Render)
# ============================================================
def get_real_ip():
    """
    Cloudflare يضع IP الحقيقي في CF-Connecting-IP.
    هذا الحقل يُضاف تلقائياً ولا يمكن تزويره من المستخدم.

    الترتيب:
      1. CF-Connecting-IP  (الأكثر أماناً — Cloudflare فقط)
      2. X-Forwarded-For   (fallback — أول IP في القائمة)
      3. remote_addr       (آخر حل)
    """
    # 1. Cloudflare (الأولوية الأولى)
    cf_ip = request.headers.get("CF-Connecting-IP", "").strip()
    if cf_ip:
        return cf_ip

    # 2. X-Forwarded-For
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # 3. fallback
    return request.remote_addr or "unknown"


# ============================================================
# 🔴 Redis Rate Limiting
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_RATE_LIMIT_STORAGE = _REDIS_URL if _REDIS_URL else "memory://"

if _REDIS_URL:
    print(f"✅ Rate Limiter: Redis ({_REDIS_URL.split('@')[-1] if '@' in _REDIS_URL else 'configured'})")
else:
    print("⚠️ Rate Limiter: memory:// (لا يوجد REDIS_URL)")

limiter = Limiter(
    key_func=get_real_ip,          # 🎯 IP الحقيقي
    default_limits=["100000 per hour", "10000 per minute"],
    storage_uri=_RATE_LIMIT_STORAGE,
    storage_options={
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
    } if _REDIS_URL else {},
    strategy="fixed-window",
    headers_enabled=True,
    swallow_errors=True,
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
    #    السبب: تفادي DDL متكرر مع Gunicorn multi-worker
    # ============================================================

    return app