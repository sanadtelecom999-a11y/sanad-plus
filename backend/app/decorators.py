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
