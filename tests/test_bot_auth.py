def test_bot_auth_endpoint(client):
    res = client.post("/api/bot/auth", json={})
    assert res.status_code in [400, 401, 403] # يجب ألا يكون 404
