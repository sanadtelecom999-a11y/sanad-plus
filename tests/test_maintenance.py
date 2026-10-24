def test_maintenance_status(client):
    res = client.get("/api/status")
    assert res.status_code == 200
