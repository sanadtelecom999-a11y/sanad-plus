import time
from collections import defaultdict

_error_notify_buckets = defaultdict(list)
_ERROR_NOTIFY_WINDOW = 300
_ERROR_NOTIFY_MAX = 3
_ERROR_NOTIFY_KEY_LEN = 80

def _should_notify_error(error_str: str) -> bool:
    if not error_str:
        return True
    key = error_str[:_ERROR_NOTIFY_KEY_LEN]
    now = time.time()
    bucket = int(now // _ERROR_NOTIFY_WINDOW)
    if len(_error_notify_buckets) > 1000:
        for k in list(_error_notify_buckets.keys()):
            if k[1] < bucket:
                del _error_notify_buckets[k]
    full_key = (key, bucket)
    _error_notify_buckets[full_key].append(now)
    count = len(_error_notify_buckets[full_key])
    if count == _ERROR_NOTIFY_MAX + 1:
        print(f"[!] Rate limit triggered for error type: {key[:50]}...")
        return True
    return count <= _ERROR_NOTIFY_MAX

def test_throttle_same_error():
    _error_notify_buckets.clear()
    error = "httpx.ReadError: connection reset by peer"
    sent = sum(1 for _ in range(20) if _should_notify_error(error))
    assert sent == 4, f"expected 4, got {sent}"
    print(f"[PASS] Same error x 20 -> {sent} notifications")

def test_throttle_different_errors():
    _error_notify_buckets.clear()
    sent = 0
    for i in range(5):
        for _ in range(2):
            if _should_notify_error(f"Error type {i}"):
                sent += 1
    assert sent == 10, f"expected 10, got {sent}"
    print(f"[PASS] 5 different errors x 2 -> {sent} notifications")

def test_empty_error():
    _error_notify_buckets.clear()
    assert _should_notify_error("") is True
    print("[PASS] Empty error -> always allowed")

def test_bucket_cleanup():
    _error_notify_buckets.clear()
    for i in range(1100):
        _error_notify_buckets[(f"old_error_{i}", 0)] = [time.time() - 3600]
    _should_notify_error("new_error")
    assert len(_error_notify_buckets) < 1100, "cleanup failed"
    print(f"[PASS] Cleanup: {len(_error_notify_buckets)} buckets remain")

if __name__ == "__main__":
    test_throttle_same_error()
    test_throttle_different_errors()
    test_empty_error()
    test_bucket_cleanup()
    print("\n[SUCCESS] All throttle tests passed")
