def test_admin_deposits_url_prefix(client):
    # التأكد من أن url_prefix يعمل
    res = client.get("/api/admin/deposits")
    assert res.status_code in [200, 401], "المسار يجب أن يكون تحت /api/admin"
