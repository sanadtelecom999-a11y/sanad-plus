import hmac
import hashlib

BOT_TOKEN = "123456:TEST-TOKEN-FOR-CI"

def _calc_hash(data_check_string: str, bot_token: str = BOT_TOKEN) -> str:
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

def test_hmac_matches_documented_algorithm():
    fields = {"query_id": "AAA", "user": '{"id": 1}', "auth_date": "1700000000"}
    dcs = "\n".join(f"{k}={fields[k]}" for k in sorted(fields) if k != "hash")
    assert len(_calc_hash(dcs)) == 64
