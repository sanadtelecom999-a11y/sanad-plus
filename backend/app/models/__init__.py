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
    created_at = db.Column(db.DateTime, default=_now)

class AdminOTPSession(db.Model):
    __tablename__ = 'admin_otp_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    total_price = db.Column(MONEY, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=_now)

class Deposit(db.Model):
    __tablename__ = 'deposits'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    amount = db.Column(MONEY, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=_now)

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


class AdminActivity(db.Model):
    __tablename__ = 'admin_activities'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer)
    action = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=_now)
