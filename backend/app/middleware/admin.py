"""Admin Middleware - Custom Decorators"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
# استيراد دالة التحقق الموجودة في admin.py أو auth.py
# سنفترض مؤقتاً أنها في admin.py، وسنستخدم استيراد دائري ذكي
def admin_required(fn):
    """
    Decorator يحل محل الفحص اليدوي:
    @jwt_required()
    if not is_admin_user(...) -> 403
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from app.routes.admin import is_admin_user # استيراد داخلي لتجنب Circular Import
        identity = get_jwt_identity()
        if not is_admin_user(identity):
            return jsonify({"error": "غير مصرح"}), 403
        return fn(*args, **kwargs)
    return wrapper
