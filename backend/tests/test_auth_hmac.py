import hmac
import hashlib

BOT_TOKEN = "123456:TEST-TOKEN-FOR-CI"

def _calc_hash(data_check_string: str, bot_token: str = BOT_TOKEN) -> str:
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

def _build_data_check_string(fields: dict) -> str:
    return "\n".join(f"{k}={fields[k]}" for k in sorted(fields) if k != "hash")

def test_hmac_matches_documented_algorithm():
    fields = {"query_id": "AAA", "user": '{"id": 1}', "auth_date": "1700000000"}
    dcs = _build_data_check_string(fields)
    signature = _calc_hash(dcs)
    assert len(signature) == 64
    assert all(c in "0123456789abcdef" for c in signature)

def test_hmac_rejects_tampered_payload():
    fields = {"auth_date": "1700000000", "user": '{"id": 1}'}
    sig_original = _calc_hash(_build_data_check_string(fields))
    fields["auth_date"] = "1700000001"
    sig_tampered = _calc_hash(_build_data_check_string(fields))
    assert not hmac.compare_digest(sig_original, sig_tampered)

def test_hmac_rejects_wrong_token():
    dcs = 'auth_date=1700000000\nuser={"id": 1}'
    sig_real = _calc_hash(dcs, bot_token=BOT_TOKEN)
    sig_fake = _calc_hash(dcs, bot_token="999999:DIFFERENT-TOKEN")
    assert not hmac.compare_digest(sig_real, sig_fake)

def test_data_check_string_excludes_hash_field():
    fields = {"a": "1", "hash": "should-be-excluded", "b": "2"}
    dcs = _build_data_check_string(fields)
    assert "hash=" not in dcs
    assert dcs == "a=1\nb=2"
