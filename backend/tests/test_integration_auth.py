"""
Integration Tests for Authentication Security.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.1
"""
import pytest
from datetime import timedelta
from app.models.base import User
from app.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture(autouse=True)
def clean_db(db):
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def test_user(db):
    u = User(telegram_id=777, first_name="AuthTest")
    db.session.add(u)
    db.session.commit()
    return u


def test_valid_token_access(client, app, test_user):
    """توكن صالح يجب أن يسمح بالمرور."""
    with app.app_context():
        token = create_access_token(identity=str(test_user.id))
    
    headers = {"Authorization": f"Bearer {token}"}
    # محاولة الوصول لمسار محمي (مثلاً جلب الطلبات)
    response = client.get("/api/orders/", headers=headers)
    assert response.status_code == 200


def test_expired_token_rejected(client, app, test_user):
    """توكن منتهي الصلاحية يجب أن يُرفض (401)."""
    with app.app_context():
        # إنشاء توكن انتهت صلاحيته قبل 10 ثوانٍ
        token = create_access_token(
            identity=str(test_user.id), 
            expires_delta=timedelta(seconds=-10)
        )
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/orders/", headers=headers)
    assert response.status_code == 401


def test_logout_blacklists_token(client, app, test_user):
    """عند تسجيل الخروج، التوكن يجب أن يُضاف للقائمة السوداء ويُرفض."""
    with app.app_context():
        token = create_access_token(identity=str(test_user.id))
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. التأكد من أن التوكن يعمل أولاً
    res1 = client.get("/api/orders/", headers=headers)
    assert res1.status_code == 200
    
    # 2. تسجيل الخروج (إبطال التوكن)
    res_logout = client.post("/api/user/logout", headers=headers)
    assert res_logout.status_code == 200
    
    # 3. محاولة استخدام نفس التوكن مرة أخرى
    res2 = client.get("/api/orders/", headers=headers)
    # يجب أن يرفض النظام التوكن لأنه أصبح في القائمة السوداء
    assert res2.status_code == 401, "Security Flaw: Token still valid after logout!"
