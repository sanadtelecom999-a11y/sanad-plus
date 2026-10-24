def test_archive_contract(client):
    res = client.get("/api/archive")
    assert res.status_code == 200
    data = res.get_json()
    assert "categories" in data, "الواجهة تتوقع مفتاح categories"
