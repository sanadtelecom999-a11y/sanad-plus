from admin_routes import admin_bp
from flask import Flask, jsonify
from .extensions import db, jwt, cors
from .blueprints import admin_bp, api_bp, bot_bp

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
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Authorization", "Content-Type"],
                "max_age": 600,
            }
        },
        supports_credentials=False,
    )
    from .routes import admin_auth, admin_dashboard, admin_users, admin_deposits, admin_settings, admin_products, admin_misc
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(bot_bp)
    @app.errorhandler(404)
    def not_found(e): return jsonify({"error": "Not found"}), 404
    @app.errorhandler(500)
    def server_error(e): return jsonify({"error": "Internal server error"}), 500
    return app
