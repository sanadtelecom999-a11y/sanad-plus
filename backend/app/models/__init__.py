from datetime import datetime, timezone
from decimal import Decimal
from ..extensions import db

MONEY = db.Numeric(14, 4)
def _now(): return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False)
    username = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    balance = db.Column(MONEY, default=Decimal('0.0000'))
    is_banned = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    created_at = db.Column(db.DateTime, default=_now)


class Setting(db.Model):
    __tablename__ = 'settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    image = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    name = db.Column(db.String(100), nullable=False)
    image = db.Column(db.Text)
    base_price = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    base_quantity = db.Column(db.Integer, default=0)
    unit_name = db.Column(db.String(50), default='قطعة')
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)
    category = db.relationship('Category', backref='products')

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(14, 4), nullable=False)
    total_price = db.Column(db.Numeric(14, 4), nullable=False)
    discount_amount = db.Column(db.Numeric(14, 4))
    coupon_code = db.Column(db.String(100))
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(100))
    delivery_data = db.Column(db.Text)
    idempotency_key = db.Column(db.String(255), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)
    is_rated = db.Column(db.Boolean)
    reviewed_by = db.Column(db.Integer)
    can_cancel_until = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    admin_note = db.Column(db.Text)
    customer_note = db.Column(db.Text)

    user = db.relationship('User', foreign_keys=[user_id])
    product = db.relationship('Product', foreign_keys=[product_id])



class Deposit(db.Model):
    __tablename__ = 'deposits'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    amount = db.Column(MONEY, nullable=False)
    transaction_id = db.Column(db.String(100), nullable=True)
    receipt_image = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=_now)
    user = db.relationship('User', foreign_keys=[user_id])

class KYCRequest(db.Model):
    __tablename__ = 'kyc_requests'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255))
    selfie_image = db.Column(db.Text)
    id_image = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending', index=True)
    submitted_at = db.Column(db.DateTime, default=_now)
    user = db.relationship('User', foreign_keys=[user_id])

class FinancialAuditLog(db.Model):
    __tablename__ = 'financial_audit_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)
    amount = db.Column(MONEY, nullable=False)
    balance_before = db.Column(MONEY, nullable=False)
    balance_after = db.Column(MONEY, nullable=False)
    created_at = db.Column(db.DateTime, default=_now)

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account = db.Column(db.Text)
    icon = db.Column(db.Text)
    min_amount = db.Column(MONEY, default=Decimal('0.0000'))
    max_amount = db.Column(MONEY, default=Decimal('500.0000'))
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)
    image = db.Column(db.Text)
    notes = db.Column(db.Text)


class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='open')
    created_at = db.Column(db.DateTime, default=_now)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)
    user = db.relationship('User', backref='support_tickets')

class SupportMessage(db.Model):
    __tablename__ = 'support_messages'
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False)
    sender_type = db.Column(db.String(10), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=_now)
    ticket = db.relationship('SupportTicket', backref='messages')

class AdminActivity(db.Model):
    __tablename__ = 'admin_activities'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer)
    action = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=_now)

class FinancialLedger(db.Model):
    __tablename__ = "financial_ledger"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(14, 4), nullable=False)
    balance_before = db.Column(db.Numeric(14, 4), nullable=False)
    balance_after = db.Column(db.Numeric(14, 4), nullable=False)
    reference = db.Column(db.String(100), nullable=True)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=_now, server_default=db.func.current_timestamp())
    user = db.relationship("User", foreign_keys=[user_id])
    __table_args__ = (db.Index("uq_financial_ledger_action_reference", "action_type", "reference", unique=True),)


class AdminUser(db.Model):
    __tablename__ = 'admin_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='admin', nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_now)

class AdminOperation(db.Model):
    __tablename__ = 'admin_operations'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, nullable=False)
    idempotency_key = db.Column(db.String(100), nullable=False)
    operation_type = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.Integer)
    payload_fingerprint = db.Column(db.String(64), nullable=False)
    result_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now)
    __table_args__ = (db.UniqueConstraint('admin_id', 'idempotency_key', name='unique_admin_idem'),)


class AdminAuditLog(db.Model):
    __tablename__ = 'admin_audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(100))
    target_type = db.Column(db.String(50))
    target_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now)


class AdminOTPSession(db.Model):
    __tablename__ = 'admin_otp_sessions'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin_users.id'), nullable=False)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    otp_hash = db.Column(db.String(64), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=_now)
