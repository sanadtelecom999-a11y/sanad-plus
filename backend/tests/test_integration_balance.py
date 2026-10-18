"""
Integration Tests for Financial APIs.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.7, §4.1
"""
import pytest
from decimal import Decimal
from app.models.base import User
from app.extensions import db
from flask_jwt_extended import create_access_token


# ✅ هذا هو "المنظف": يمسح أي مستخدمين قدامى قبل كل اختبار
@pytest.fixture(autouse=True)
def clean_db(db):
    db.session.query(User).delete()
    db.session.commit()


@pytest.fixture()
def admin_headers(app):
    with app.app_context():
        token = create_access_token(
            identity="admin",
            additional_claims={"telegram_id": 123456789}
        )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_user(db):
    u = User(
        telegram_id=999,
        first_name="IntegrationTest",
        balance=Decimal("10.0000"),
        max_negative_balance=Decimal("-5.0000"),
    )
    db.session.add(u)
    db.session.commit()
    return u


def test_balance_endpoint_requires_auth(client, test_user):
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": 10.0, "note": "test"}
    )
    assert response.status_code == 401


def test_balance_endpoint_success(client, admin_headers, test_user, db):
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": 20.0, "note": "تعويض"},
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["balance"] == 30.0 
    
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("30.0000")


def test_balance_endpoint_limit_exceeded(client, admin_headers, test_user):
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": -20.0, "note": "خصم كبير"}, 
        headers=admin_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    assert data.get("code") == "BALANCE_LIMIT_EXCEEDED"
