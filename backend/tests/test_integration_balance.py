"""
Integration Tests for Financial APIs.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.7, §4.1
اختبار الـ Endpoints الحقيقية (Routes -> Auth -> DB)
"""
import pytest
from decimal import Decimal
from app.models.base import User
from app.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture()
def admin_headers(app):
    """توليد توكن JWT وهمي للأدمن لتجاوز المصادقة."""
    with app.app_context():
        # بناء توكن أدمن (بناءً على §2.1 في الوثيقة)
        token = create_access_token(
            identity="admin",
            additional_claims={"telegram_id": 123456789}
        )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_user(db):
    """إنشاء مستخدم تجريبي."""
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
    """محاولة تعديل الرصيد بدون توكن يجب أن ترجع 401."""
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": 10.0, "note": "test"}
    )
    assert response.status_code == 401


def test_balance_endpoint_success(client, admin_headers, test_user, db):
    """تعديل الرصيد بنجاح (محاكاة الأدمن)."""
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": 20.0, "note": "تعويض"},
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["balance"] == 30.0 # 10 + 20
    
    # التحقق من أن قاعدة البيانات تحدثت فعلاً
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("30.0000")


def test_balance_endpoint_limit_exceeded(client, admin_headers, test_user):
    """محاولة خصم يخترق الحد السالب يجب أن ترجع 400."""
    response = client.post(
        f"/admin/api/users/{test_user.id}/balance",
        json={"amount": -20.0, "note": "خصم كبير"}, # 10 - 20 = -10 (أقل من -5)
        headers=admin_headers
    )
    
    assert response.status_code == 400
    data = response.get_json()
    # بناءً على §3 من الوثيقة (Error Schema)
    assert data.get("code") == "BALANCE_LIMIT_EXCEEDED"
