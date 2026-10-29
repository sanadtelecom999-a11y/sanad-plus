from decimal import Decimal, InvalidOperation
from app.extensions import db
from app.models import FinancialLedger

MONEY_QUANTUM = Decimal("0.0001")
MAX_MONEY = Decimal("10000000000")

def _to_money(value):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("قيمة مالية غير صالحة.") from exc
    if not amount.is_finite():
        raise ValueError("يجب أن تكون القيمة المالية رقمًا محدودًا.")
    try:
        rounded = amount.quantize(MONEY_QUANTUM)
    except InvalidOperation as exc:
        raise ValueError("القيمة المالية تتجاوز الدقة المقبولة.") from exc
    if rounded != amount:
        raise ValueError("القيمة المالية تتجاوز أربع خانات عشرية.")
    if abs(rounded) >= MAX_MONEY:
        raise ValueError("القيمة المالية تتجاوز سعة العمود NUMERIC(14,4).")
    return rounded

def record_transaction(user_id, action_type, amount, balance_before, balance_after, reference=None, description=None):
    action_type = str(action_type).strip()
    if not action_type or len(action_type) > 50:
        raise ValueError("نوع الحركة المالية غير صالح.")
    reference = None if reference is None else str(reference)
    description = None if description is None else str(description)
    if reference is not None and len(reference) > 100:
        raise ValueError("مرجع الحركة يتجاوز الطول المسموح.")
    if description is not None and len(description) > 255:
        description = description[:255]
    entry = FinancialLedger(
        user_id=user_id, action_type=action_type, amount=_to_money(amount),
        balance_before=_to_money(balance_before), balance_after=_to_money(balance_after),
        reference=reference, description=description,
    )
    db.session.add(entry)
    return entry
