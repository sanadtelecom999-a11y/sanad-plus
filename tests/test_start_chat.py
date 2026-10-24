def test_start_chat_route(client):
    res = client.post("/api/admin/support/start-chat", json={})
    # نتوقع 400 (بيانات ناقصة) بدلاً من 404 (مسار غير موجود)
    assert res.status_code != 404
