import os
from flask import jsonify, request
from app.extensions import db, cache

def setup_middlewares(app):
    @app.before_request
    def check_maintenance():
        # تفعيل وضع الصيانة عبر Render Env Var
        if os.getenv("MAINTENANCE_MODE") == "1":
            # نسمح بمرور فحص الصحة فقط للتأكد من أن السيرفر حي
            if request.path != "/api/health":
                return jsonify({
                    "error": "النظام تحت الصيانة حالياً. نعتذر عن الإزعاج.",
                    "code": "MAINTENANCE_MODE"
                }), 503

    @app.route('/api/health', methods=['GET'])
    def health_check():
        status = {"status": "ok", "db": "unknown", "redis": "unknown", "bot_heartbeat": "unknown"}
        code = 200
        
        # 1. فحص قاعدة البيانات
        try:
            db.session.execute(db.text('SELECT 1'))
            status["db"] = "connected"
        except Exception:
            status["db"] = "disconnected"
            code = 503

        # 2. فحص Redis ونبضات البوت
        try:
            if cache.ping():
                status["redis"] = "connected"
                hb = cache.get("bot:heartbeat")
                status["bot_heartbeat"] = "alive" if hb else "stale"
            else:
                status["redis"] = "disconnected"
                code = 503
        except Exception:
            status["redis"] = "disconnected"
            code = 503

        return jsonify(status), code
