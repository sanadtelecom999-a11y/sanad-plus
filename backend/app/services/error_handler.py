"""تشخيص أخطاء قيود قاعدة البيانات (IntegrityError)."""
from sqlalchemy.exc import IntegrityError, FlushError
import re

def diagnose_integrity_error(error):
    """يرجع اسم القيد المنتهك، أو None."""
    if not isinstance(error, (IntegrityError, FlushError)):
        return None
    orig = getattr(error, 'orig', None)
    if orig is None:
        return None
    diag = getattr(orig, 'diag', None)
    if diag is not None:
        return getattr(diag, 'constraint_name', None)
    args = getattr(orig, 'args', [])
    if args and isinstance(args[0], str):
        m = re.search(r'constraint "([^"]+)"', args[0])
        if m:
            return m.group(1)
    return None
