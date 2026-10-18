"""
Integration Tests for Orders Flow.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.2, §3.1, §4.2
"""
import pytest
from decimal import Decimal
from app.models.base import User, Product, Category, Order
from app.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture(autouse=True)
def clean_db(db):
    # مسح الجداول بالترتيب العكسي
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def user_headers(app):
    with app.app_context():
        token = create_access_token(identity="1", additional_claims={"telegram_id": 999})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_user(db):
    u = User(
        telegram_id=999,
        first_name="OrderTest",
        balance=Decimal("50.0000"),
        max_negative_balance=Decimal("0.0000"),
    )
    db.session.add(u)
    db.session.commit()
    return u


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
    """إنشاء طلب يجب أن يخصم الرصيد."""
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
    
    assert response.status_code == 200
    data = response.get_json()
    
    # الرصيد كان 50، السعر 10، يجب أن يصبح 40
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("40.0000")


def test_create_order_idempotency(client, user_headers, test_user, test_product, db):
    """إرسال نفس الطلب مرتين (نفس الـ idempotency_key) يجب ألا يخصم الرصيد مرتين."""
    payload = {
        "product_id": test_product.id,
        "quantity": 1,
        "custom_input": "Player123",
        "idempotency_key": "unique-key-456"
    }
    
    # الطلب الأول
    res1 = client.post("/api/orders/create", json=payload, headers=user_headers)
    assert res1.status_code == 200
    
    # الطلب الثاني (مكرر)
    res2 = client.post("/api/orders/create", json=payload, headers=user_headers)
    
    # يجب أن يرجع 200 (أو 409 حسب كودك) لكن الرصيد يجب ألا يتأثر مرة أخرى
    assert res2.status_code in [200, 409]
    
    db.session.refresh(test_user)
    # الرصيد يجب أن يكون 40 فقط (خصم مرة واحدة)
    assert test_user.balance == Decimal("40.0000")


def test_cancel_order_refunds_balance(client, user_headers, test_user, test_product, db):
    """إلغاء الطلب (خلال 120 ثانية) يجب أن يرجع المبلغ للرصيد."""
    # 1. إنشاء طلب
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
    assert res.status_code == 200
    order_id = res.get_json()["order_id"]
    
    # 2. إلغاء الطلب
    res_cancel = client.post(f"/api/orders/{order_id}/cancel", headers=user_headers)
    assert res_cancel.status_code == 200
    
    # 3. التحقق من الرصيد (يجب أن يرجع 50)
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("50.0000")
    
    # التحقق من حالة الطلب
    order = db.session.get(Order, order_id)
    assert order.status == "cancelled"
