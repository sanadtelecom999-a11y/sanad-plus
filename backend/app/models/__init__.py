from datetime import datetime
from ..extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, nullable=False, unique=True)
    username = db.Column(db.String)
    first_name = db.Column(db.String)
    balance = db.Column(db.Numeric, default=0)
    is_banned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AdminOTPSession(db.Model):
    __tablename__ = 'admin_otp_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String, nullable=False)
    code_hash = db.Column(db.String, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

class Setting(db.Model):
    __tablename__ = 'settings'
    key = db.Column(db.String, primary_key=True)
    value = db.Column(db.String)

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    deleted_at = db.Column(db.DateTime)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    base_price = db.Column(db.Numeric, nullable=False)
    stock = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String, nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_price = db.Column(db.Numeric, nullable=False)
    status = db.Column(db.String, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Deposit(db.Model):
    __tablename__ = 'deposits'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric, nullable=False)
    status = db.Column(db.String, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class FinancialAuditLog(db.Model):
    __tablename__ = 'financial_audit_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String, nullable=False)
    amount = db.Column(db.Numeric, nullable=False)
    balance_before = db.Column(db.Numeric, nullable=False)
    balance_after = db.Column(db.Numeric, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
