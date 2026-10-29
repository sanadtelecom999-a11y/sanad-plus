from functools import wraps
from flask import request, g, jsonify
from app.telegram_auth import verify_telegram_auth

def require_telegram_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)

        init_data = (
            request.headers.get('X-Telegram-Init-Data')
            or (request.get_json(silent=True) or {}).get('initData')
            or request.form.get('initData')
        )

        if not init_data:
            return jsonify({'error': 'Missing initData'}), 401

        is_valid, result = verify_telegram_auth(init_data)
        if not is_valid:
            return jsonify({'error': f'Unauthorized: {result}'}), 401

        g.telegram_id = int(result['id'])
        g.telegram_user = result
        return f(*args, **kwargs)
    return wrapper

from collections import defaultdict
from datetime import datetime, timedelta

# مخزن مؤقت في الذاكرة (Memory)
_rate_limit_storage = defaultdict(list)

def rate_limit(max_requests=10, window_seconds=60):
    """
    Decorator لتحديد عدد الطلبات المسموح بها من نفس الـ IP.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr or "unknown"
            now = datetime.now()
            window_start = now - timedelta(seconds=window_seconds)
            
            # تنظيف الطلبات القديمة
            _rate_limit_storage[ip] = [t for t in _rate_limit_storage[ip] if t > window_start]
            
            if len(_rate_limit_storage[ip]) >= max_requests:
                return jsonify({
                    "error": "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.",
                    "code": "RATE_LIMIT_EXCEEDED"
                }), 429
                
            _rate_limit_storage[ip].append(now)
            return f(*args, **kwargs)
        return wrapper
    return decorator
