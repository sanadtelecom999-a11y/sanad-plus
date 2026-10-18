import pytest
from app import create_app
from app.extensions import db as _db

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config.update(TESTING=True, DATABASE_URL="sqlite:///:memory:", SKIP_BOT="1")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()
