"""
Admin Auth Service - Business Logic.
فصل منطق المصادقة (OTP، Rate Limiting) عن ملف الـ Routes.
"""
import os
import secrets
import time
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from app.extensions import db
from app.models.base import AdminOTPSession

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 3

def get_admin_ids():
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        return [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        return []

def generate_otp_code():
    # SRE FIX: استخدام secrets بدلاً من random لمنع التنبؤ بالـ OTP
    return str(secrets.randbelow(900000) + 100000)

def cleanup_expired_otp_sessions():
    try:
        AdminOTPSession.query.filter(
            AdminOTPSession.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"cleanup expired sessions error: {e}")

# ============================================================
# Rate Limiting Logic (In-Memory Fallback)
# ============================================================
LOGIN_RATE_WINDOW = 300
LOGIN_RATE_MAX = 5
LOGIN_RATE_MAX_KEYS = 10_000

# SRE FIX: استخدام deque لتجنب O(n) واستهلاك الذاكرة العشوائي
_login_attempts = defaultdict(lambda: deque(maxlen=LOGIN_RATE_MAX))

def check_login_rate_limit(ip: str) -> bool:
    now = time.time()
    
    # تنظيف الطوابع الزمنية القديمة من الـ deque
    dq = _login_attempts[ip]
    while dq and now - dq[0] > LOGIN_RATE_WINDOW:
        dq.popleft()

    # التحقق من تجاوز الحد
    if len(dq) >= LOGIN_RATE_MAX:
        return False

    # DoS mitigation: تنظيف الذاكرة إذا وصلنا لعدد كبير جداً من الـ IPs
    if len(_login_attempts) >= LOGIN_RATE_MAX_KEYS:
        # حذف أقدم 25% من المفاتيح
        keys_to_remove = list(_login_attempts.keys())[:LOGIN_RATE_MAX_KEYS // 4]
        for k in keys_to_remove:
            del _login_attempts[k]

    dq.append(now)
    return True