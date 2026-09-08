from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .models.base import User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod, KYCRequest, Notification, Transaction, Setting, Admin, AdminActivity, ServiceRequest

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # تفعيل CORS للسماح بالاتصال من أي مصدر
    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app