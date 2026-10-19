"""
Admin Service - Business Logic.
فصل منطق العمل عن الـ Routes لتسهيل الصيانة والاختبار.
"""
from decimal import Decimal
from app.extensions import db
from app.models.base import User

class AdminServiceError(Exception):
    """استثناء مخصص لأخطاء خدمة الأدمن"""
    def __init__(self, message, code):
        super().__init__(message)
        self.message = message
        self.code = code


def adjust_user_balance(user_id: int, amount: Decimal, note: str = None) -> User:
    """
    تعديل رصيد المستخدم مع التحقق من الحدود المالية.
    يعيد كائن المستخدم بعد التعديل، أو يرفع AdminServiceError.
    """
    # 1. قفل الصف (Row Lock) لمنع Race Conditions
    user = User.query.filter_by(id=user_id).with_for_update().first()
    if not user:
        raise AdminServiceError("المستخدم غير موجود", "USER_NOT_FOUND")

    # 2. حساب الرصيد الجديد
    new_balance = user.balance + amount

    # 3. التحقق من الحدود
    min_allowed = user.max_negative_balance if getattr(user, 'allow_negative_balance', False) else Decimal("0.0000")
    
    if new_balance < min_allowed:
        raise AdminServiceError(
            "الرصيد سيصبح أقل من الحد الأدنى المسموح", 
            "BALANCE_LIMIT_EXCEEDED"
        )

    # 4. حفظ التعديل
    user.balance = new_balance
    
    # (اختياري: هنا يمكن إضافة سجل التدقيق المالي FinancialAuditLog)
    
    db.session.commit()
    return user
