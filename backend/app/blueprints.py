"""Centralized blueprints — single source of truth.
⚠️  لا تعرّف Blueprint في أي مكان آخر.
"""
from flask import Blueprint

admin_bp = Blueprint("admin", __name__, url_prefix='/api/admin')
main_bp  = Blueprint("main",  __name__)
bot_bp   = Blueprint("bot",   __name__, url_prefix="/api/bot")

__all__ = ["admin_bp", "main_bp", "bot_bp"]
