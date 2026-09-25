# ============================================================
# 🛡️ SANAD PLUS⁺ — Models v18.2
# ============================================================
# 🆕 v18.2: كل الحقول المالية NUMERIC(14,4) بدل FLOAT
# الأسباب:
#   - FLOAT يسبب فروقات سنتات (0.1 + 0.2 ≠ 0.3)
#   - الأرصدة لا تطابق مجموع الحركات
#   - خلافات مع الزبائن
# ============================================================
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Numeric, CheckConstraint, Index
from ..extensions import db


# ════════════════════════════════════════════════════════════
# Money type
# ════════════════════════════════════════════════════════════
MONEY = Numeric(14, 4)


def _now():
    return datetime.now(timezone.utc)


# ════════════════════════════════════════════════════════════
# USERS
# ════════════════════════════════════════════════════════════
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False, index=True)
    username = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    # 💰 NUMERIC
    balance = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    referral_earnings = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    max_negative_balance = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    general_discount = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))

    kyc_status = db.Column(db.String(20), default='unverified')
    is_verified = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default='user')
    is_banned = db.Column(db.Boolean, default=False)
    vip_level = db.Column(db.Integer, default=0)
    referral_code = db.Column(db.String(50), unique=True, index=True)
    referred_by = db.Column(db.BigInteger)
    referred_by_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
    )
    referral_count = db.Column(db.Integer, default=0)

    allow_negative_balance = db.Column(db.Boolean, default=False)
    notify_marketing = db.Column(db.Boolean, default=True)  # 🆕 v18.2

    created_at = db.Column(db.DateTime, default=_now)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            'referred_by_id IS NULL OR referred_by_id != id',
            name='chk_users_referred_not_self',
        ),
        Index('idx_users_kyc_status', 'kyc_status'),
        Index('idx_users_vip_level', 'vip_level'),
        Index('idx_users_is_banned', 'is_banned'),
    )


# ════════════════════════════════════════════════════════════
# CATEGORIES
# ════════════════════════════════════════════════════════════
class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    deleted_at = db.Column(db.DateTime)

    products = db.relationship('Product', backref='category', lazy='dynamic')


# ════════════════════════════════════════════════════════════
# PRODUCTS
# ════════════════════════════════════════════════════════════
class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    product_type = db.Column(db.String(20), default='quantity')
    # ═══════════════════════════════════════════════════════════
    # ⚠️ SEMANTIC CONTRACT — DO NOT CHANGE WITHOUT UPDATING MiniApp
    # ═══════════════════════════════════════════════════════════
    # base_quantity = عدد الوحدات في الحزمة الكاملة
    # base_price    = السعر الإجمالي للحزمة الكاملة (base_quantity وحدة)
    #
    # الحساب الصحيح:
    #   unit_price = base_price / base_quantity
    #   total      = unit_price × quantity
    #
    # ❌ base_price ليس سعر الوحدة
    # ✅ مثال: Xena Live — 8700 وحدة بـ 1.00$ (0.000115$ للوحدة)
    # ═══════════════════════════════════════════════════════════
    base_quantity = db.Column(db.Integer, default=0)
    base_price = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    unit_name = db.Column(db.String(50), default='قطعة')
    input_type = db.Column(db.String(20), default='id')
    custom_input_label = db.Column(db.String(100))
    stock = db.Column(db.Integer, nullable=True)  # NULL = غير محدود
    max_quantity = db.Column(db.Integer, default=0)
    is_bundle = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)

    bundles = db.relationship(
        'ProductBundle',
        backref='product',
        lazy='selectin',
        cascade='all, delete-orphan',
    )

    __table_args__ = (
        Index(
            'idx_products_category_active',
            'category_id', 'is_active',
            postgresql_where=db.text('deleted_at IS NULL'),
        ),
    )


class ProductBundle(db.Model):
    __tablename__ = 'product_bundles'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_usd = db.Column(MONEY, nullable=False)
    is_active = db.Column(db.Boolean, default=True)


# ════════════════════════════════════════════════════════════
# ORDERS
# ════════════════════════════════════════════════════════════
class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Integer, nullable=False)

    unit_price = db.Column(MONEY, nullable=False)
    total_price = db.Column(MONEY, nullable=False)
    discount_amount = db.Column(MONEY, default=Decimal('0.0000'))

    coupon_code = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending', index=True)
    payment_method = db.Column(db.String(50))
    delivery_data = db.Column(db.Text)
    idempotency_key = db.Column(db.String(100), unique=True)
    reviewed_by = db.Column(db.Integer)
    can_cancel_until = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=_now, index=True)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    user = db.relationship('User', foreign_keys=[user_id])
    product = db.relationship('Product', foreign_keys=[product_id])

    __table_args__ = (
        Index('idx_orders_user_status', 'user_id', 'status'),
    )


# ════════════════════════════════════════════════════════════
# DEPOSITS
# ════════════════════════════════════════════════════════════
class Deposit(db.Model):
    __tablename__ = 'deposits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    amount = db.Column(MONEY, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.id'))
    method = db.Column(db.String(100))
    proof_image = db.Column(db.Text)  # v18.2: public_id من Cloudinary
    account_number = db.Column(db.String(100))
    sender_name = db.Column(db.String(100))
    txid = db.Column(db.String(100))
    transaction_id = db.Column(db.String(100), unique=True, index=True)
    fee = db.Column(MONEY, default=Decimal('0.0000'))
    status = db.Column(db.String(20), default='pending', index=True)
    admin_note = db.Column(db.Text)
    idempotency_key = db.Column(db.String(100), unique=True)
    reviewed_by = db.Column(db.Integer)
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=_now, index=True)

    user = db.relationship('User', foreign_keys=[user_id])
    payment_method = db.relationship('PaymentMethod', foreign_keys=[method_id])

    __table_args__ = (
        Index('idx_deposits_user_status', 'user_id', 'status'),
        Index(
            'uq_deposit_txid_user',
            'user_id', 'txid',
            unique=True,
            postgresql_where=db.text("txid IS NOT NULL AND txid != ''"),
        ),
    )


# ════════════════════════════════════════════════════════════
# PAYMENT METHODS
# ════════════════════════════════════════════════════════════
class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    account_name = db.Column(db.String(100))
    account = db.Column(db.Text)
    icon = db.Column(db.Text)
    qr_image = db.Column(db.Text)

    min_amount = db.Column(MONEY, default=Decimal('0.0000'))
    max_amount = db.Column(MONEY, default=Decimal('500.0000'))  # 🆕 v18.2
    fee = db.Column(MONEY, default=Decimal('0.0000'))
    fee_type = db.Column(db.String(20), default="percentage")  # v18.3.6

    requires_kyc = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)


# ════════════════════════════════════════════════════════════
# KYC
# ════════════════════════════════════════════════════════════
class KYCRequest(db.Model):
    __tablename__ = 'kyc_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255))
    selfie_image = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending', index=True)
    admin_note = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer)
    submitted_at = db.Column(db.DateTime, default=_now)
    reviewed_at = db.Column(db.DateTime)

    user = db.relationship('User', foreign_keys=[user_id])


# ════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════════════════════
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    title = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(50), default='info')
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        Index('idx_notifications_user_read', 'user_id', 'is_read'),
    )


# ════════════════════════════════════════════════════════════
# TRANSACTIONS
# ════════════════════════════════════════════════════════════
class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    type = db.Column(db.String(50))
    amount = db.Column(MONEY, nullable=False)
    balance_after = db.Column(MONEY)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        Index('idx_transactions_user_created', 'user_id', 'created_at'),
    )


# ════════════════════════════════════════════════════════════
# SETTINGS
# ════════════════════════════════════════════════════════════
class Setting(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)


# ════════════════════════════════════════════════════════════
# ADMIN OTP
# ════════════════════════════════════════════════════════════
class AdminOTPSession(db.Model):
    __tablename__ = 'admin_otp_sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String(45))
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# JWT BLACKLIST
# ════════════════════════════════════════════════════════════
class JWTBlacklist(db.Model):
    __tablename__ = 'jwt_blacklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(100), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# ADMIN ACTIVITY
# ════════════════════════════════════════════════════════════
class AdminActivity(db.Model):
    __tablename__ = 'admin_activities'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer)
    action = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# SERVICE REQUESTS
# ════════════════════════════════════════════════════════════
class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    service_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    estimated_price = db.Column(MONEY)
    status = db.Column(db.String(20), default='pending', index=True)
    admin_response = db.Column(db.Text)
    admin_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=_now)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    user = db.relationship('User', foreign_keys=[user_id])


# ════════════════════════════════════════════════════════════
# COUPONS
# ════════════════════════════════════════════════════════════
class Coupon(db.Model):
    __tablename__ = 'coupons'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    discount_type = db.Column(db.String(20), default='percentage')
    discount_value = db.Column(MONEY, nullable=False)
    min_amount = db.Column(MONEY, default=Decimal('0.0000'))
    max_discount = db.Column(MONEY, default=Decimal('0.0000'))
    max_uses = db.Column(db.Integer, default=0)
    used_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_now)
    deleted_at = db.Column(db.DateTime)

    __table_args__ = (
        Index(
            'idx_coupons_code_active',
            'code', 'is_active',
            postgresql_where=db.text('deleted_at IS NULL'),
        ),
    )


class CouponUsage(db.Model):
    __tablename__ = 'coupon_usages'

    id = db.Column(db.Integer, primary_key=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    discount_applied = db.Column(MONEY, default=Decimal('0.0000'))
    used_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        db.UniqueConstraint('coupon_id', 'user_id', name='uq_coupon_user'),
    )


# ════════════════════════════════════════════════════════════
# REFERRALS
# ════════════════════════════════════════════════════════════
class Referral(db.Model):
    __tablename__ = 'referrals'

    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    referred_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    reward_amount = db.Column(MONEY, default=Decimal('0.0000'))
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=_now)
    completed_at = db.Column(db.DateTime)

    referrer = db.relationship('User', foreign_keys=[referrer_id])
    referred_user = db.relationship('User', foreign_keys=[referred_user_id])


# ════════════════════════════════════════════════════════════
# FINANCIAL AUDIT LOG
# ════════════════════════════════════════════════════════════
class FinancialAuditLog(db.Model):
    __tablename__ = 'financial_audit_log'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)
    amount = db.Column(MONEY, nullable=False)
    balance_before = db.Column(MONEY, nullable=False)
    balance_after = db.Column(MONEY, nullable=False)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    admin_id = db.Column(db.Integer)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now, index=True)

    __table_args__ = (
        Index('idx_audit_user_created', 'user_id', 'created_at'),
        Index('idx_audit_action', 'action', 'created_at'),
    )


def log_financial(user, action, amount, balance_before, balance_after,
                  ref_type=None, ref_id=None, admin_id=None, note=None):
    """سجل كل حركة مالية — يحفظ IP و User-Agent."""
    from flask import request
    from .. import get_real_ip

    try:
        ip = get_real_ip()
    except Exception:
        ip = None

    log = FinancialAuditLog(
        user_id=user.id,
        action=action,
        amount=Decimal(str(amount)),
        balance_before=Decimal(str(balance_before)),
        balance_after=Decimal(str(balance_after)),
        reference_type=ref_type,
        reference_id=ref_id,
        admin_id=admin_id,
        ip_address=ip,
        user_agent=request.headers.get('User-Agent', '')[:500] if request else None,
        note=note,
    )
    db.session.add(log)
    return log


# ════════════════════════════════════════════════════════════
# USER PRODUCT DISCOUNTS
# ════════════════════════════════════════════════════════════
class UserProductDiscount(db.Model):
    __tablename__ = 'user_product_discounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
    )
    product_id = db.Column(
        db.Integer,
        db.ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
    )
    discount_percent = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'product_id', name='uq_user_product_discount'),
        Index('idx_upd_user', 'user_id'),
        Index('idx_upd_product', 'product_id'),
    )