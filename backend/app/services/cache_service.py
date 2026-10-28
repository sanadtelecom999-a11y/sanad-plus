import time

# نظام كاش حقيقي في الذاكرة (In-Memory)
_memory_cache = {}

def cache_set(key, value, ttl=3600, *args, **kwargs):
    _memory_cache[key] = {
        "value": value,
        "expires_at": time.time() + ttl
    }
    return True

def cache_get(key, *args, **kwargs):
    if key in _memory_cache:
        if time.time() < _memory_cache[key]["expires_at"]:
            return _memory_cache[key]["value"]
        else:
            del _memory_cache[key]
    return None

def cache_delete(key, *args, **kwargs):
    if key in _memory_cache:
        del _memory_cache[key]
    return True
