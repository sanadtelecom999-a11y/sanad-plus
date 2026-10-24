def test_html_escaping(client):
    # التأكد من حماية البوت من الحقن
    from backend.app.utils.security import escape_html
    assert escape_html("<script>alert(1)</script>") == "&lt;script&gt;alert(1)&lt;/script&gt;"
