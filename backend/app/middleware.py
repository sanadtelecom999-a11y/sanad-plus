import os
from flask import jsonify, request
from app.extensions import db

def setup_middlewares(app):
    @app.before_request
    def check_maintenance():
        if os.getenv("MAINTENANCE_MODE") == "1":
            if request.path != "/api/health":
                return jsonify({"error": "الصيانة", "code": "MAINTENANCE_MODE"}), 503

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(db.text('SELECT 1'))
            return jsonify({"status": "ok", "db": "connected"}), 200
        except Exception:
            return jsonify({"status": "error", "db": "disconnected"}), 503

from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from app.routes.admin import is_admin_user
        identity = get_jwt_identity()
        if not is_admin_user(identity):
            return jsonify({"error": "غير مصرح"}), 403
        return fn(*args, **kwargs)
    return wrapper
