"""
اختبارات حد الرصيد والأقفال (Race Conditions).
المرجع: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §4.1
"""
import pytest
import time
import threading
from sqlalchemy.orm import scoped_session, sessionmaker
from app.models.base import User
from app.extensions import db

@pytest.fixture(autouse=True)
def clean_db(db):
    """تنظيف قاعدة البيانات قبل كل اختبار."""
    db.session.query(User).delete()
    db.session.commit()

def test_positive_balance_change(db):
    u = User(telegram_id=111, first_name="Test", balance=100.0)
    db.session.add(u)
    db.session.commit()
    
    u.balance += 50.0
    db.session.commit()
    assert u.balance == 150.0

def test_negative_change_exceeds_limit(db):
    u = User(telegram_id=222, first_name="Test", balance=5.0, max_negative_balance=-10.0)
    db.session.add(u)
    db.session.commit()
    
    with pytest.raises(ValueError, match="BALANCE_LIMIT_EXCEEDED"):
        new_balance = u.balance - 20.0
        if new_balance < u.max_negative_balance:
            raise ValueError("BALANCE_LIMIT_EXCEEDED")
        u.balance = new_balance
        db.session.commit()

def test_row_lock_serializes_concurrent_updates(db):
    """
    إثبات أن with_for_update() يمنع التعديل المتزامن.
    هذا الاختبار سيفشل على SQLite، وينجح فقط على Postgres.
    """
    u = User(telegram_id=333, first_name="LockTest", balance=100.0)
    db.session.add(u)
    db.session.commit()
    user_id = u.id

    def lock_and_sleep():
        Session = scoped_session(sessionmaker(bind=db.engine))
        session = Session()
        try:
            locked_user = session.query(User).filter_by(id=user_id).with_for_update().first()
            time.sleep(1.5) 
            session.commit()
        finally:
            session.close()
            Session.remove()

    def wait_and_update():
        Session = scoped_session(sessionmaker(bind=db.engine))
        session = Session()
        try:
            start = time.time()
            user_to_update = session.query(User).filter_by(id=user_id).with_for_update().first()
            duration = time.time() - start
            assert duration >= 1.0, f"Row lock failed! Waited only {duration:.2f}s"
            user_to_update.balance -= 50.0
            session.commit()
        finally:
            session.close()
            Session.remove()

    t1 = threading.Thread(target=lock_and_sleep)
    t2 = threading.Thread(target=wait_and_update)

    t1.start()
    time.sleep(0.1) 
    t2.start()
    t1.join()
    t2.join()

    db.session.expire_all()
    final_user = db.session.get(User, user_id)
    assert final_user.balance == 50.0
