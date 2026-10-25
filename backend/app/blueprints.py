from flask import Blueprint
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
api_bp = Blueprint('api', __name__, url_prefix='/api')
bot_bp = Blueprint('bot', __name__, url_prefix='/api/bot')
