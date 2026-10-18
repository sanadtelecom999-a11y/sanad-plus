"""
Integration Tests for Bot Authentication.
Reference: SANAD_PLUS_MASTER_REFERENCE_v24.0.0 §2.3, §7
"""
import pytest
import os
from app.models.base import User
from app.extensions import db


@pytest.fixture(autouse=True)
def clean_db(db):
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def bot_headers(app, monkeypatch):
    # ✅ استخدام monkeypatch لضمان تعيين المتغير البيئي قبل قراءته بواسطة الكود
    monkeypatch.setenv("BOT_API_SECRET", "test-secret-bot-token")
    app.config['BOT_API_SECRET'] = 'test-secret-bot-token'
    
    # ✅ إجبار Flask على طباعة الخطأ الحقيقي بدلاً من إخفائه خلف 500
    app.config['PROPAGATE_EXCEPTIONS'] = True
    
    return {"X-Bot-Token": "test-secret-bot-token"}


def test_bot_auth_valid_token(client, bot_headers):
    """توكن صحيح يجب أن يسمح بإنشاء/تحديث مستخدم البوت."""
    response = client.post(
        "/api/bot/auth",
        json={"telegram_id": 123456, "first_name": "BotUser"},
        headers=bot_headers
    )
    assert response.status_code == 200, f"API Error: {response.get_json()}"
    data = response.get_json()
    assert "id" in data
    assert "balance" in data


def test_bot_auth_invalid_token(client, bot_headers):
    """توكن خاطئ يجب أن يُرفض (401 أو 403)."""
    response = client.post(
        "/api/bot/auth",
        json={"telegram_id": 123456, "first_name": "BotUser"},
        headers={"X-Bot-Token": "WRONG-TOKEN"}
    )
    assert response.status_code in [401, 403], "Security Flaw: Invalid bot token accepted!"


def test_bot_auth_missing_token(client, bot_headers):
    """غياب التوكن يجب أن يُرفض (401 أو 403)."""
    response = client.post(
        "/api/bot/auth",
        json={"telegram_id": 123456, "first_name": "BotUser"}
    )
    assert response.status_code in [401, 403], "Security Flaw: Missing bot token accepted!"
