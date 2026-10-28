# ملف وهمي مرن يقبل أي متغيرات لمنع انهيار البوت
def cache_set(*args, **kwargs):
    return True

def cache_get(*args, **kwargs):
    return None

def cache_delete(*args, **kwargs):
    return True
