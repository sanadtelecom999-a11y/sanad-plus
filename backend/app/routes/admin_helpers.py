# ============================================================
# admin_helpers.py — Shared utilities for admin routes
# Created for security audit v18.6
# ============================================================
import uuid
import traceback
from functools import wraps
from datetime import datetime, timezone

import sentry_sdk
from flask import jsonify
from flask_jwt_extended import (
    verify_jwt_in_request, get_jwt_identity, get_jwt
)

from ..extensions import db


# ============================================================
# admin_required decorator — combines JWT + role + revocation
# Fixes: CRIT-1 (token revocation enforcement)
# ============================================================
def admin_required(f):
    """
    Decorator يجمع:
    - JWT verification
    - Admin role check
    - Token revocation check (logout-all)
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        
        if get_jwt_identity() != "admin":
            return jsonify({"error": "غير مصرح"}), 403
        
        # CRIT-1: enforce revoke_all_admin_sessions
        from .auth import is_admin_token_revoked
        if is_admin_token_revoked(get_jwt()):
            return jsonify({
                "error": "انتهت الجلسة. الرجاء تسجيل الدخول من جديد."
            }), 401
        
        return f(*args, **kwargs)
    return wrapper


# ============================================================
# get_admin_telegram_id — extract admin identity for audit log
# Fixes: CRIT-3 (admin_id = None)
# ============================================================
def get_admin_telegram_id():
    """يرجع telegram_id للأدمن الحالي، أو None."""
    try:
        jwt_data = get_jwt()
        return jwt_data.get("telegram_id")
    except Exception:
        return None


# ============================================================
# safe_error_response — لا يكشف str(e) للـclient
# Fixes: CRIT-2 (info leak)
# ============================================================
def safe_error_response(e, function_name=""):
    """
    يرسل استجابة خطأ آمنة.
    - يسجل الخطأ في Sentry
    - يرسل error_id للمستخدم (للمراجعة)
    - لا يكشف تفاصيل داخلية
    """
    db.session.rollback()
    tb = traceback.format_exc()
    error_id = uuid.uuid4().hex[:12]
    
    # سجل في logs الداخلية
    print(f"[{error_id}] Error in {function_name}: {e}")
    print(tb)
    
    # أرسل إلى Sentry
    try:
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("error_id", error_id)
            scope.set_tag("function", function_name)
            sentry_sdk.capture_exception(e)
    except Exception:
        pass
    
    return jsonify({
        "error": "حدث خطأ داخلي. الرجاء المحاولة لاحقًا.",
        "error_id": error_id,
    }), 500


# ============================================================
# chunked_bulk_insert — DoS mitigation for broadcast
# Fixes: HIGH-2
# ============================================================
def chunked_bulk_insert(model, rows, batch_size=500):
    """
    Insert آمن لكميات كبيرة.
    يمنع timeout و memory bloat.
    """
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        db.session.bulk_insert_mappings(model, batch)
        db.session.commit()