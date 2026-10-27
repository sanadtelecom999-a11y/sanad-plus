"""
مسارات الأدمن — SANAD+ Admin Panel
المرحلة 0: المصادقة (login + verify-otp)
"""

import os
import secrets
import uuid
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


def _utcnow():
    return datetime.now(timezone.utc)


def _generate_otp():
    return "{:06d}".format(secrets.randbelow(1000000))


def _issue_jwt():
    now = _utcnow()
    payload = {
        "sub": "admin",
        "role": "admin",
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header[len("Bearer "):].strip()
        try:
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()

    if not password:
        return jsonify({"success": False, "error": "كلمة المرور مطلوبة"}), 400

    if password != ADMIN_PASSWORD:
        return jsonify({"success": False, "error": "كلمة المرور غير صحيحة"}), 401

    session_id = str(uuid.uuid4())
    otp_code = _generate_otp()

    _admin_sessions[session_id] = {
        "otp_code": otp_code,
        "created_at": _utcnow(),
        "attempts": 0,
    }

    print("[ADMIN OTP] session={} code={}".format(session_id, otp_code), flush=True)

    return jsonify({
        "success": True,
        "require_otp": True,
        "session_id": session_id,
    })


@admin_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    otp_code = (data.get("otp_code") or "").strip()

    session = _admin_sessions.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "الجلسة غير صالحة أو منتهية"}), 401

    if _utcnow() - session["created_at"] > timedelta(minutes=OTP_TTL_MINUTES):
        _admin_sessions.pop(session_id, None)
        return jsonify({"success": False, "error": "انتهت صلاحية الرمز، أعد تسجيل الدخول"}), 401

    session["attempts"] += 1
    if session["attempts"] > MAX_OTP_ATTEMPTS:
        _admin_sessions.pop(session_id, None)
        return jsonify({"success": False, "error": "عدد محاولات كبير، أعد تسجيل الدخول"}), 429

    if otp_code != session["otp_code"]:
        return jsonify({"success": False, "error": "رمز OTP غير صحيح"}), 401

    _admin_sessions.pop(session_id, None)
    token = _issue_jwt()
    return jsonify({"token": token, "access_token": token})


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    return jsonify({
        "total_users": 0,
        "total_orders": 0,
        "total_deposits": 0,
        "revenue": 0.0,
    })
