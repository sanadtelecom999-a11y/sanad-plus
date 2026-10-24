def test_blueprints_imports():
    from backend.app.blueprints import admin_bp, main_bp, bot_bp
    assert admin_bp is not None
    assert main_bp is not None
    assert bot_bp is not None
