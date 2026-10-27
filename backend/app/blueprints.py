from flask import Blueprint

# تم إزالة admin_bp من هنا لأنه أصبح يُستورد مباشرة من admin_routes.py
api_bp = Blueprint('api', __name__, url_prefix='/api')
bot_bp = Blueprint('bot', __name__, url_prefix='/api/bot')
