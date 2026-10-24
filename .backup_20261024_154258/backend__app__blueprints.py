from flask import Blueprint

# تعريف مركزي لجميع الـ Blueprints لمنع أخطاء NameError
admin_bp = Blueprint("admin", __name__)
main_bp = Blueprint("main", __name__)
bot_bp = Blueprint("bot", __name__)
