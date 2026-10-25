from flask import Flask, jsonify
from .extensions import db, jwt, cors
from .blueprints import admin_bp, api_bp, bot_bp

def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": ["https://sanad-plus-admi.vercel.app", "https://sanad-plus.vercel.app"]}})

    # 1. استيراد المسارات أولاً (لتضيف نفسها إلى الـ Blueprints)
    from .routes import admin_auth  # noqa: F401

    # 2. ثم تسجيل الـ Blueprints
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(bot_bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"code": "NOT_FOUND", "error": "المسار غير موجود"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"code": "SERVER_ERROR", "error": "خطأ داخلي"}), 500

    return app
