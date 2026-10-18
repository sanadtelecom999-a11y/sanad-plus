"""اختبار شرطية SSL - يمنع كسر الإنتاج مستقبلاً."""
import os
import pytest
from unittest.mock import patch
import importlib

@pytest.mark.parametrize("db_url,expected_ssl", [
    ("postgresql://user:pass@ep-xyz.neon.tech/sanad", True),
    ("postgresql://postgres:pass@localhost:5432/sanad_test", False),
    ("postgresql://postgres:pass@localhost:5432/sanad_test?sslmode=disable", False),
])
def test_ssl_enforcement(db_url, expected_ssl):
    with patch.dict(os.environ, {"DATABASE_URL": db_url}):
        import app.config
        importlib.reload(app.config)
        
        connect_args = app.config.Config.SQLALCHEMY_ENGINE_OPTIONS.get("connect_args", {})
        is_ssl_required = connect_args.get("sslmode") == "require"
        
        assert is_ssl_required is expected_ssl, (
            f"DB_URL={db_url}: expected ssl={expected_ssl}, got {is_ssl_required}"
        )
