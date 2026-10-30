from app.notifications import (notify_order_approved, notify_order_rejected, notify_deposit_approved, notify_deposit_rejected, notify_kyc_approved, notify_kyc_rejected, notify_balance_adjusted)
from decimal import Decimal
from app.services.ledger_service import record_transaction
from app.decorators import rate_limit
import os
import hashlib
import json, secrets, uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import Blueprint, jsonify, request

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
_admin_sessions = {}
OTP_TTL_MINUTES = 5
MAX_OTP_ATTEMPTS = 5

def log_admin_action(action, target_type, target_id, details=""):
    try:
        from app.extensions import db
        from sqlalchemy import text
        db.session.execute(text("CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, admin_name VARCHAR(50) DEFAULT 'Admin', action VARCHAR(100), target_type VARCHAR(50), target_id INT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
        db.session.execute(text("INSERT INTO admin_audit_logs (action, target_type, target_id, details) VALUES (:action, :target_type, :target_id, :details)"), {"action": action, "target_type": target_type, "target_id": target_id, "details": details})
    except Exception as e: print("Audit Log Error:", e, flush=True)

def _utcnow(): return datetime.now(timezone.utc)
def _generate_otp(): return "{:06d}".format(secrets.randbelow(1000000))
def _issue_jwt():
    now = _utcnow()
    return jwt.encode({"sub": "admin", "role": "admin", "iat": now, "exp": now + timedelta(hours=JWT_EXPIRY_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Auth"}), 401
        try:
            payload = jwt.decode(auth_header[7:].strip(), JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        admin_id = payload.get("admin_id")
        if not admin_id:
            return jsonify({"error": "Invalid token payload"}), 401

        from app.models import AdminUser
        admin = db.session.query(AdminUser).filter_by(id=admin_id, is_active=True).first()
        if not admin:
            return jsonify({"error": "Admin not found or disabled"}), 403

        g.admin_id = admin.id
        g.admin_role = admin.role
        return fn(*args, **kwargs)
    return wrapper

