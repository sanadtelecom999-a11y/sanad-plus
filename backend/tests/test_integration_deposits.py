"""
Integration Tests for Deposit Flow.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.2, §4.1
"""
import pytest
from decimal import Decimal
from app.models.base import User, Deposit
from app.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture(autouse=True)
def clean_db(db):
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def test_user(db):
    u = User(
        telegram_id=999,
        first_name="DepositTest",
        balance=Decimal("0.0000"),
        max_negative_balance=Decimal("0.0000"),
        is_verified=True,
    )
    db.session.add(u)
    db.session.commit()
    return u


@pytest.fixture()
def admin_headers(app):
    with app.app_context():
        token = create_access_token(
            identity="admin",
            additional_claims={"telegram_id": 123456789} # نفس رقم الأدمن في الـ config
        )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def pending_deposit(db, test_user):
    d = Deposit(
        user_id=test_user.id,
        amount=Decimal("50.0000"),
        status="pending",
        # transaction_id="dummy_tx_123" # قد تحتاج إضافة هذا إذا كان الحقل إلزامياً
    )
    db.session.add(d)
    db.session.commit()
    return d


def test_approve_deposit_requires_auth(client, pending_deposit):
    """اعتماد الإيداع بدون توكن أدمن يجب أن يرجع 401 أو 403."""
    response = client.post(f"/admin/api/deposits/{pending_deposit.id}/approve")
    assert response.status_code in [401, 403]


def test_approve_deposit_success(client, admin_headers, test_user, pending_deposit, db):
    """اعتماد الإيداع بنجاح يجب أن يضيف الرصيد ويغير الحالة."""
    response = client.post(
        f"/admin/api/deposits/{pending_deposit.id}/approve",
        headers=admin_headers
    )
    assert response.status_code == 200, f"API Error: {response.get_json()}"
    
    # 1. التأكد من إضافة الرصيد
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("50.0000")
    
    # 2. التأكد من تغيير حالة الإيداع
    db.session.refresh(pending_deposit)
    assert pending_deposit.status in ["approved", "completed"]


def test_double_approve_deposit_prevented(client, admin_headers, test_user, pending_deposit, db):
    """محاولة اعتماد نفس الإيداع مرتين يجب أن تفشل ولا تضيف رصيداً مضاعفاً."""
    # المرة الأولى
    res1 = client.post(f"/admin/api/deposits/{pending_deposit.id}/approve", headers=admin_headers)
    assert res1.status_code == 200
    
    # المرة الثانية (محاولة الغش)
    res2 = client.post(f"/admin/api/deposits/{pending_deposit.id}/approve", headers=admin_headers)
    
    # يجب أن يرجع كود خطأ (مثلاً 400)
    assert res2.status_code == 400, f"Security flaw! Double approval allowed: {res2.get_json()}"
    
    # الرصيد يجب أن يظل 50 فقط
    db.session.refresh(test_user)
    assert test_user.balance == Decimal("50.0000")
