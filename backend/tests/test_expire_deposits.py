import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from app.models.base import User, Deposit
from app.services.deposit_service import expire_old_deposits
from app.extensions import db

@pytest.fixture(autouse=True)
def clean_db(db):
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()

def test_expire_old_deposits(db):
    u = User(telegram_id=888, first_name="ExpiryTest", balance=Decimal("0.0000"))
    db.session.add(u)
    db.session.commit()

    old_date = datetime.utcnow() - timedelta(days=31)
    old_dep = Deposit(user_id=u.id, amount=Decimal("50.0000"), status="pending", created_at=old_date)
    
    recent_date = datetime.utcnow() - timedelta(days=10)
    recent_dep = Deposit(user_id=u.id, amount=Decimal("20.0000"), status="pending", created_at=recent_date)
    
    db.session.add_all([old_dep, recent_dep])
    db.session.commit()
    
    expired_count = expire_old_deposits(days=30)
    
    assert expired_count == 1
    db.session.refresh(old_dep)
    db.session.refresh(recent_dep)
    assert old_dep.status == "expired"
    assert recent_dep.status == "pending"
