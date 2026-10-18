import pytest
from decimal import Decimal
from app.models.base import User, Product, Category, Order
from app.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture(autouse=True)
def clean_db(db):
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def test_user(db):
    # ✅ أضفنا الحقول التي قد يشترطها الـ API (مثل التوثيق)
    u = User(
        telegram_id=999,
        first_name="OrderTest",
        balance=Decimal("50.0000"),
        max_negative_balance=Decimal("0.0000"),
        is_verified=True,  # مهم جداً
        is_banned=False,
    )
    db.session.add(u)
    db.session.commit()
    return u


@pytest.fixture()
def user_headers(app, test_user):
    with app.app_context():
        token = create_access_token(
            identity=str(test_user.id), 
            additional_claims={"telegram_id": 999}
        )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_product(db):
    cat = Category(name="Test Cat", is_active=True)
    db.session.add(cat)
    db.session.flush()
    
    p = Product(
        category_id=cat.id, 
        name="Test Product", 
        base_price=Decimal("10.0000"), 
        is_active=True
    )
    db.session.add(p)
    db.session.commit()
    return p


def test_create_order_deducts_balance(client, user_headers, test_user, test_product, db):
    response = client.post(
        "/api/orders/create",
        json={
            "product_id": test_product.id,
            "quantity": 1,
            "custom_input": "Player123",
            "idempotency_key": "unique-key-123"
        },
        headers=user_headers
    )
    # ✅ سيظهر لنا رسالة الخطأ الحقيقية إذا فشل
    assert response.status_code == 200, f"API Error: {response.get_json()}"
    
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("40.0000")


def test_create_order_idempotency(client, user_headers, test_user, test_product, db):
    payload = {
        "product_id": test_product.id,
        "quantity": 1,
        "custom_input": "Player123",
        "idempotency_key": "unique-key-456"
    }
    res1 = client.post("/api/orders/create", json=payload, headers=user_headers)
    assert res1.status_code == 200, f"API Error: {res1.get_json()}"
    
    res2 = client.post("/api/orders/create", json=payload, headers=user_headers)
    assert res2.status_code in [200, 409], f"API Error: {res2.get_json()}"
    
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("40.0000")


def test_cancel_order_refunds_balance(client, user_headers, test_user, test_product, db):
    res = client.post(
        "/api/orders/create",
        json={
            "product_id": test_product.id,
            "quantity": 1,
            "custom_input": "Player123",
            "idempotency_key": "unique-key-789"
        },
        headers=user_headers
    )
    assert res.status_code == 200, f"API Error: {res.get_json()}"
    order_id = res.get_json()["order_id"]
    
    res_cancel = client.post(f"/api/orders/{order_id}/cancel", headers=user_headers)
    assert res_cancel.status_code == 200, f"Cancel Error: {res_cancel.get_json()}"
    
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("50.0000")
    
    order = db.session.get(Order, order_id)
    assert order.status == "cancelled"
