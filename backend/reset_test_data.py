# ============================================================
# 🧹 SANAD PLUS⁺ — Reset Test Data
# ============================================================
"""
يحذف كل البيانات التجريبية ويُصفّر أرصدة المستخدمين.
يحتفظ بـ: users, categories, products, payment_methods, settings, coupons.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.base import (
    User, Order, Deposit, KYCRequest, ServiceRequest,
    Transaction, Notification, Referral, FinancialAuditLog,
    Coupon, CouponUsage
)


def show_current_state():
    print("📊 الحالة الحالية:")
    print(f"   Orders:           {Order.query.count()}")
    print(f"   Deposits:         {Deposit.query.count()}")
    print(f"   KYC Requests:     {KYCRequest.query.count()}")
    print(f"   Service Requests: {ServiceRequest.query.count()}")
    print(f"   Transactions:     {Transaction.query.count()}")
    print(f"   Notifications:    {Notification.query.count()}")
    print(f"   Referrals:        {Referral.query.count()}")
    print(f"   Audit Log:        {FinancialAuditLog.query.count()}")
    print(f"   Coupon Usages:    {CouponUsage.query.count()}")
    print(f"   Users:            {User.query.count()}")
    print()


def reset_all_data():
    print("=" * 60)
    print("🧹 SANAD Reset Test Data")
    print("=" * 60)
    print()

    show_current_state()

    counts = {}

    print("📦 جارٍ الحذف...")
    print()

    counts['coupon_usages'] = CouponUsage.query.delete()
    print(f"   ✅ coupon_usages:        {counts['coupon_usages']}")

    counts['notifications'] = Notification.query.delete()
    print(f"   ✅ notifications:        {counts['notifications']}")

    counts['transactions'] = Transaction.query.delete()
    print(f"   ✅ transactions:         {counts['transactions']}")

    counts['referrals'] = Referral.query.delete()
    print(f"   ✅ referrals:            {counts['referrals']}")

    counts['kyc'] = KYCRequest.query.delete()
    print(f"   ✅ kyc_requests:         {counts['kyc']}")

    counts['services'] = ServiceRequest.query.delete()
    print(f"   ✅ service_requests:     {counts['services']}")

    counts['deposits'] = Deposit.query.delete()
    print(f"   ✅ deposits:             {counts['deposits']}")

    counts['orders'] = Order.query.delete()
    print(f"   ✅ orders:               {counts['orders']}")

    counts['audit_log'] = FinancialAuditLog.query.delete()
    print(f"   ✅ financial_audit_log:  {counts['audit_log']}")

    print()
    print("👤 جارٍ تصفير المستخدمين...")

    users = User.query.all()
    users_reset = 0

    for user in users:
        user.balance = 0.0
        user.referral_earnings = 0.0
        user.referral_count = 0
        user.referred_by = None
        user.referred_by_id = None
        user.kyc_status = 'unverified'
        user.is_verified = False
        user.vip_level = 0
        users_reset += 1

    counts['users_reset'] = users_reset
    print(f"   ✅ users_reset:          {users_reset}")

    try:
        db.session.commit()
        print()
        print("=" * 60)
        print("✅ تم التنظيف بنجاح")
        print("=" * 60)
        print()
        print("📊 ملخص:")
        for key, value in counts.items():
            print(f"   {key:22s}: {value:>6}")
        print()
        print("💡 تم الاحتفاظ بـ:")
        print("   • المستخدمون (أرصدة = 0)")
        print("   • الأقسام والمنتجات")
        print("   • طرق الدفع")
        print("   • الإعدادات (SYP rate)")
        print("   • الكوبونات (فقط حُذفت استخداماتها)")
        print()
        return True

    except Exception as e:
        db.session.rollback()
        print(f"\n❌ فشل: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        print()
        print("⚠️  تحذير: هذا الإجراء لا يمكن التراجع عنه.")
        print()
        confirm = input("اكتب 'YES' للمتابعة: ")

        if confirm.strip() != 'YES':
            print("❌ تم الإلغاء.")
            sys.exit(0)

        success = reset_all_data()
        sys.exit(0 if success else 1)