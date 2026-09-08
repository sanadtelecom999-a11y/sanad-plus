from app import create_app
from app.extensions import db
from app.models.base import User

app = create_app()
with app.app_context():
    user = User(
        telegram_id=8673286954,
        username='tester',
        first_name='مستخدم تجريبي',
        balance=100.0,
        kyc_status='unverified',
        is_verified=False,
        role='user'
    )
    db.session.add(user)
    db.session.commit()
    print("تم إنشاء المستخدم")