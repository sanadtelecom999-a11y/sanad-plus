"""
Admin Auth Service - Business Logic.
فصل منطق المصادقة (OTP، Rate Limiting) عن ملف الـ Routes.
"""
import os
import random
import time
from datetime import datetime, timezone
from app.extensions import db
from app.models.base import AdminOTPSession

OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 3

def get_admin_ids():
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        return [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        return []

def generate_otp_code():
    return str(random.randint(100000, 999999))

def cleanup_expired_otp_sessions():
    try:
        AdminOTPSession.query.filter(
            AdminOTPSession.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"cleanup expired sessions: {e}")

# Rate Limiting Logic
_login_attempts = {}
LOGIN_RATE_WINDOW = 300
LOGIN_RATE_MAX = 5
LOGIN_RATE_MAX_KEYS = 10_000

def check_login_rate_limit(ip: str) -> bool:
    now = time.time()
    if ip in _login_attempts:
        _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < LOGIN_RATE_WINDOW]

    if len(_login_attempts.get(ip, [])) >= LOGIN_RATE_MAX:
        return False

    # DoS mitigation
    if len(_login_attempts) >= LOGIN_RATE_MAX_KEYS:
        keys_to_remove = list(_login_attempts.keys())[:LOGIN_RATE_MAX_KEYS // 4]
        for k in keys_to_remove:
            del _login_attempts[k]

    _login_attempts.setdefault(ip, []).append(now)
    return True
