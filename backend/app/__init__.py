import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
from flask import Flask, jsonify
from .extensions import db, jwt, cors
from .blueprints import api_bp, bot_bp
from admin_routes import admin_bp
from public_routes import public_bp

def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)
    
    # تهيئة الإضافات
    db.init_app(app)
    jwt.init_app(app)
    
    # إعدادات CORS
    allowed_origins = [
        "https://sanad-plus.pages.dev",
        "https://sanad-plus-admin.pages.dev",
        "https://baf047b7.sanad-plus.pages.dev"
    ]

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": "*", # للسماح للميني آب بالاتصال
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Authorization", "Content-Type", "X-Telegram-Init-Data"],
                "max_age": 600,
            }
        },
        supports_credentials=False,
    )
    
    # تسجيل المسارات (Blueprints)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(bot_bp)
    app.register_blueprint(public_bp)
    
    # معالجة الأخطاء
    @app.errorhandler(404)
    def not_found(e): 
        return jsonify({"error": "Not found"}), 404
        
    @app.errorhandler(500)
    def server_error(e): 
        return jsonify({"error": "Internal server error"}), 500
        
    return app
