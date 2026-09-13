from datetime import datetime, timezone
from ..extensions import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False)
    username = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    balance = db.Column(db.Float, default=0.0)
    kyc_status = db.Column(db.String(20), default="unverified")
    is_verified = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default="user")
    is_banned = db.Column(db.Boolean, default=False)
    vip_level = db.Column(db.Integer, default=0)
    referral_code = db.Column(db.String(50), unique=True)
    referred_by = db.Column(db.BigInteger)
    referral_earnings = db.Column(db.Float, default=0.0)
    referral_count = db.Column(db.Integer, default=0)

    # 🆕 الرصيد السالب
    allow_negative_balance = db.Column(db.Boolean, default=True)
    max_negative_balance = db.Column(db.Float, default=0.0)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    orders = db.relationship("Order", backref="user", lazy=True)
    deposits = db.relationship("Deposit", backref="user", lazy=True)
    kyc_requests = db.relationship("KYCRequest", backref="user", lazy=True)
    notifications = db.relationship("Notification", backref="user", lazy=True)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)
    products = db.relationship("Product", backref="category", lazy=True)


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    product_type = db.Column(db.String(20), default="quantity")
    base_quantity = db.Column(db.Integer, default=0)
    base_price = db.Column(db.Float, nullable=False, default=0.0)
    unit_name = db.Column(db.String(50), default="قطعة")
    input_type = db.Column(db.String(20), default="id")
    custom_input_label = db.Column(db.String(100))
    stock = db.Column(db.Integer, default=0)
    max_quantity = db.Column(db.Integer, default=0)
    is_bundle = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    bundles = db.relationship("ProductBundle", backref="product", lazy=True)
    orders = db.relationship("Order", backref="product", lazy=True)


class ProductBundle(db.Model):
    __tablename__ = "product_bundles"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_usd = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)


class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    discount_amount = db.Column(db.Float, default=0.0)
    coupon_code = db.Column(db.String(50))
    status = db.Column(db.String(20), default="pending")
    payment_method = db.Column(db.String(50))
    delivery_data = db.Column(db.Text)
    idempotency_key = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Deposit(db.Model):
    __tablename__ = "deposits"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="USD")
    method = db.Column(db.String(100))
    proof_image = db.Column(db.Text)
    account_number = db.Column(db.String(100))
    sender_name = db.Column(db.String(100))
    txid = db.Column(db.String(100))
    transaction_id = db.Column(db.String(100), unique=True)
    fee = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default="pending")
    admin_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class PaymentMethod(db.Model):
    __tablename__ = "payment_methods"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    account_name = db.Column(db.String(100))
    account = db.Column(db.Text)
    icon = db.Column(db.Text)
    qr_image = db.Column(db.Text)
    min_amount = db.Column(db.Float, default=0)
    fee = db.Column(db.Float, default=0)
    requires_kyc = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)


class KYCRequest(db.Model):
    __tablename__ = "kyc_requests"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    selfie_image = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending")
    admin_note = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime)


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    title = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(50), default="info")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Transaction(db.Model):
    __tablename__ = "transactions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(50))
    amount = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Setting(db.Model):
    __tablename__ = "settings"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)


class Admin(db.Model):
    __tablename__ = "admins"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class AdminActivity(db.Model):
    __tablename__ = "admin_activities"
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id"))
    action = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class ServiceRequest(db.Model):
    __tablename__ = "service_requests"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    estimated_price = db.Column(db.Float)
    status = db.Column(db.String(20), default="pending")
    admin_response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Coupon(db.Model):
    __tablename__ = "coupons"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    discount_type = db.Column(db.String(20), default="percentage")
    discount_value = db.Column(db.Float, nullable=False)
    min_amount = db.Column(db.Float, default=0)
    max_discount = db.Column(db.Float, default=0)
    max_uses = db.Column(db.Integer, default=0)
    used_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class CouponUsage(db.Model):
    __tablename__ = "coupon_usages"
    __table_args__ = (
        db.UniqueConstraint('coupon_id', 'user_id', name='uq_coupon_user'),
    )
    id = db.Column(db.Integer, primary_key=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey("coupons.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"))
    used_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Referral(db.Model):
    __tablename__ = "referrals"
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    referred_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reward_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime)


# ============================================================
# Financial Audit Log
# ============================================================
class FinancialAuditLog(db.Model):
    __tablename__ = "financial_audit_log"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    balance_before = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float, nullable=False)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    admin_id = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


def log_financial(user, action, amount, balance_before, balance_after,
                  ref_type=None, ref_id=None, admin_id=None, note=None):
    """تسجيل عملية مالية في سجل التدقيق"""
    from flask import request, has_request_context

    ip = None
    ua = None
    if has_request_context():
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        if ip:
            ip = ip.split(",")[0].strip()
        ua = request.headers.get("User-Agent", "")[:500]

    log = FinancialAuditLog(
        user_id=user.id,
        action=action,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type=ref_type,
        reference_id=ref_id,
        admin_id=admin_id,
        ip_address=ip,
        user_agent=ua,
        note=note,
    )
    db.session.add(log)