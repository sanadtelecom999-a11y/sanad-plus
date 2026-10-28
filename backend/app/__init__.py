from flask import Flask, jsonify
from .extensions import db, jwt, cors
from admin_routes import admin_bp
from public_routes import public_bp
from .blueprints import api_bp, bot_bp
from public_api import public_bp

def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)
    db.init_app(app)
    jwt.init_app(app)
    allowed_origins = [
        "https://sanad-plus.pages.dev",
        "https://sanad-plus-admin.pages.dev",
    ]
    
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Authorization", "Content-Type"],
                "max_age": 600,
            }
        },
        supports_credentials=False,
    )
    app.register_blueprint(admin_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(bot_bp)

    @app.before_request
    def check_maintenance_mode():
        from flask import request, jsonify
        from .extensions import db
        from sqlalchemy import text
        
        # تجاهل طلبات الأدمن وملفات الواجهة الثابتة
        if request.path.startswith('/api/admin') or request.method == 'OPTIONS' or not request.path.startswith('/api'):
            return None
            
        # تجاهل طلبات جلب الإعدادات
        if request.path == '/api/settings':
            return None
            
        try:
            # قراءة وضع الصيانة من قاعدة البيانات
            row = db.session.execute(text("SELECT value FROM app_settings WHERE key = 'maintenance_mode'")).fetchone()
            if row and str(row[0]).lower() == 'true':
                return jsonify({"error": "المتجر تحت الصيانة حالياً. يرجى المحاولة لاحقاً.", "maintenance": True}), 503
        except Exception:
            pass # في حال لم يتم إنشاء الجدول بعد، نسمح بالمرور
        
        return None

    @app.errorhandler(404)
    def not_found(e): return jsonify({"error": "Not found"}), 404
    @app.errorhandler(500)
    def server_error(e): return jsonify({"error": "Internal server error"}), 500
    return app
