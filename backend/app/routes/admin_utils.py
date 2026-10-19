"""Admin Utils - Shared Helpers and Decorators to prevent circular imports."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..config import Config
from ..models.base import AdminActivity
from ..extensions import db
import traceback

def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Error in {f.__name__}: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
    return wrapper

def is_admin_user(identity):
    try:
        admin_ids = [int(x) for x in Config.TELEGRAM_ADMIN_IDS]
        return int(identity) in admin_ids
    except:
        return False
