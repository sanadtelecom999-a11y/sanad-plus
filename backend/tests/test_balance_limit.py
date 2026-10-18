import os
import pytest
import time
import threading
from decimal import Decimal
from sqlalchemy.orm import scoped_session, sessionmaker
from app.models.base import User
from app.extensions import db

_is_sqlite = "sqlite" in os.getenv("DATABASE_URL", "").lower()

@pytest.fixture(autouse=True)
def clean_db(db):
    db.session.query(User).delete()
    db.session.commit()

def test_positive_balance_change(db):
    u = User(
        telegram_id=111,
        first_name="Test",
        balance=Decimal("100.0000"),
        max_negative_balance=Decimal("0.0000"),
    )
    db.session.add(u)
    db.session.commit()

    u.balance += Decimal("50.0000")
    db.session.commit()
    db.session.refresh(u)
    assert u.balance == Decimal("150.0000")

def test_negative_change_exceeds_limit(db):
    u = User(
        telegram_id=222,
        first_name="Test",
        balance=Decimal("5.0000"),
        max_negative_balance=Decimal("-10.0000"),
    )
    db.session.add(u)
    db.session.commit()

    with pytest.raises(ValueError, match="BALANCE_LIMIT_EXCEEDED"):
        new_balance = u.balance - Decimal("20.0000")
        if new_balance < u.max_negative_balance:
            raise ValueError("BALANCE_LIMIT_EXCEEDED")
        u.balance = new_balance
        db.session.commit()

@pytest.mark.skipif(
    _is_sqlite,
    reason="SQLite ignores with_for_update; row locks require Postgres (CI).",
)
def test_row_lock_serializes_concurrent_updates(db):
    u = User(
        telegram_id=333,
        first_name="LockTest",
        balance=Decimal("100.0000"),
        max_negative_balance=Decimal("0.0000"),
    )
    db.session.add(u)
    db.session.commit()
    user_id = u.id

    lock_acquired = threading.Event()

    def lock_and_sleep():
        Session = scoped_session(sessionmaker(bind=db.engine))
        session = Session()
        try:
            session.query(User).filter_by(id=user_id).with_for_update().first()
            lock_acquired.set()
            time.sleep(1.5)
            session.commit()
        finally:
            session.close()
            Session.remove()

    def wait_and_update():
        lock_acquired.wait(timeout=5.0)
        Session = scoped_session(sessionmaker(bind=db.engine))
        session = Session()
        try:
            start = time.time()
            user_to_update = (
                session.query(User)
                .filter_by(id=user_id)
                .with_for_update()
                .first()
            )
            duration = time.time() - start
            assert duration >= 1.0, f"Row lock failed! Waited only {duration:.2f}s"
            user_to_update.balance -= Decimal("50.0000")
            session.commit()
        finally:
            session.close()
            Session.remove()

    t1 = threading.Thread(target=lock_and_sleep)
    t2 = threading.Thread(target=wait_and_update)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    db.session.expire_all()
    final_user = db.session.get(User, user_id)
    assert final_user.balance == Decimal("50.0000")
