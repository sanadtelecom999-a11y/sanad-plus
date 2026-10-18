from app import create_app
from app.extensions import db
from app.models.base import User, Category, Product, Setting
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    db.create_all()
    if not User.query.first():
        u = User(telegram_id=123456789, first_name="Test Admin", balance=100.0)
        db.session.add(u)
        cat = Category(name="Test Category", is_active=True)
        db.session.add(cat)
        db.session.flush()
        p = Product(category_id=cat.id, name="Test Product", base_price=1.0, is_active=True)
        db.session.add(p)
        db.session.add(Setting(key="syp_rate", value="132"))
        db.session.commit()
        print("✅ Seed data created successfully.")
