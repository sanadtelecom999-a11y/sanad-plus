"""Pytest fixtures - shared across all backend tests."""
import os
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SKIP_BOT", "1")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-32-chars-minimum-xxxxxx")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-jwt-key-32-chars-minimum-yyyyyy")
os.environ.setdefault("ADMIN_PASSWORD_HASH", "scrypt:32768:8:1$dummyhashfortests")
os.environ.setdefault("TELEGRAM_ADMIN_IDS", "123456789")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sanad_test")

import pytest
from app import create_app
from app.extensions import db as _db


@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db(app):
    return _db
