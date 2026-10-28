# ملف وهمي لمنع انهيار البوت بسبب الملفات المحذوفة
def cache_set(key, value, ex=3600):
    return True

def cache_get(key):
    return None

def cache_delete(key):
    return True
