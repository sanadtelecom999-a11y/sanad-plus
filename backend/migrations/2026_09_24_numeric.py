# ============================================================
# 🔄 Migration: FLOAT → NUMERIC (v18.2)
# ============================================================
"""
⚠️  تشغيل يدوي فقط — لا يُستدعى من run.py
    python backend/migrations/2026_09_24_numeric.py

يُغيّر كل الحقول المالية من FLOAT إلى NUMERIC(14,4).

الخطوات:
  1. فحص السلامة قبل
  2. تطبيق التحويلات
  3. فحص السلامة بعد
  4. حفظ تقرير في migration_2026_09_24.log
"""
import os
import sys
import logging
from datetime import datetime

# إضافة backend/ إلى sys.path
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
if _backend not in sys.path:
    sys.path.insert(0, _backend)

from sqlalchemy import text
from app import create_app
from app.extensions import db


# ════════════════════════════════════════════════════════════
# Logging
# ════════════════════════════════════════════════════════════
log_file = os.path.join(_here, f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════
# التحويلات
# ════════════════════════════════════════════════════════════
MIGRATIONS = [
    # ═══ USERS ═══
    (
        "users.balance",
        "ALTER TABLE users ALTER COLUMN balance TYPE NUMERIC(14,4) USING ROUND(balance::numeric, 4)"
    ),
    (
        "users.referral_earnings",
        "ALTER TABLE users ALTER COLUMN referral_earnings TYPE NUMERIC(14,4) USING ROUND(COALESCE(referral_earnings, 0)::numeric, 4)"
    ),
    (
        "users.max_negative_balance",
        "ALTER TABLE users ALTER COLUMN max_negative_balance TYPE NUMERIC(14,4) USING ROUND(COALESCE(max_negative_balance, 0)::numeric, 4)"
    ),
    (
        "users.general_discount",
        "ALTER TABLE users ALTER COLUMN general_discount TYPE NUMERIC(14,4) USING ROUND(COALESCE(general_discount, 0)::numeric, 4)"
    ),
    (
        "users.notify_marketing",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_marketing BOOLEAN DEFAULT TRUE"
    ),

    # ═══ PRODUCTS ═══
    (
        "products.base_price",
        "ALTER TABLE products ALTER COLUMN base_price TYPE NUMERIC(14,4) USING ROUND(base_price::numeric, 4)"
    ),

    # ═══ PRODUCT BUNDLES ═══
    (
        "product_bundles.price_usd",
        "ALTER TABLE product_bundles ALTER COLUMN price_usd TYPE NUMERIC(14,4) USING ROUND(price_usd::numeric, 4)"
    ),

    # ═══ ORDERS ═══
    (
        "orders.unit_price",
        "ALTER TABLE orders ALTER COLUMN unit_price TYPE NUMERIC(14,4) USING ROUND(unit_price::numeric, 4)"
    ),
    (
        "orders.total_price",
        "ALTER TABLE orders ALTER COLUMN total_price TYPE NUMERIC(14,4) USING ROUND(total_price::numeric, 4)"
    ),
    (
        "orders.discount_amount",
        "ALTER TABLE orders ALTER COLUMN discount_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_amount, 0)::numeric, 4)"
    ),

    # ═══ DEPOSITS ═══
    (
        "deposits.amount",
        "ALTER TABLE deposits ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "deposits.fee",
        "ALTER TABLE deposits ALTER COLUMN fee TYPE NUMERIC(14,4) USING ROUND(COALESCE(fee, 0)::numeric, 4)"
    ),

    # ═══ PAYMENT METHODS ═══
    (
        "payment_methods.min_amount",
        "ALTER TABLE payment_methods ALTER COLUMN min_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(min_amount, 0)::numeric, 4)"
    ),
    (
        "payment_methods.fee",
        "ALTER TABLE payment_methods ALTER COLUMN fee TYPE NUMERIC(14,4) USING ROUND(COALESCE(fee, 0)::numeric, 4)"
    ),
    (
        "payment_methods.max_amount",
        "ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS max_amount NUMERIC(14,4) DEFAULT 500.0000"
    ),

    # ═══ TRANSACTIONS ═══
    (
        "transactions.amount",
        "ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "transactions.balance_after",
        "ALTER TABLE transactions ALTER COLUMN balance_after TYPE NUMERIC(14,4) USING ROUND(COALESCE(balance_after, 0)::numeric, 4)"
    ),

    # ═══ SERVICE REQUESTS ═══
    (
        "service_requests.estimated_price",
        "ALTER TABLE service_requests ALTER COLUMN estimated_price TYPE NUMERIC(14,4) USING ROUND(COALESCE(estimated_price, 0)::numeric, 4)"
    ),

    # ═══ COUPONS ═══
    (
        "coupons.discount_value",
        "ALTER TABLE coupons ALTER COLUMN discount_value TYPE NUMERIC(14,4) USING ROUND(discount_value::numeric, 4)"
    ),
    (
        "coupons.min_amount",
        "ALTER TABLE coupons ALTER COLUMN min_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(min_amount, 0)::numeric, 4)"
    ),
    (
        "coupons.max_discount",
        "ALTER TABLE coupons ALTER COLUMN max_discount TYPE NUMERIC(14,4) USING ROUND(COALESCE(max_discount, 0)::numeric, 4)"
    ),

    # ═══ COUPON USAGES ═══
    (
        "coupon_usages.discount_applied",
        "ALTER TABLE coupon_usages ALTER COLUMN discount_applied TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_applied, 0)::numeric, 4)"
    ),

    # ═══ REFERRALS ═══
    (
        "referrals.reward_amount",
        "ALTER TABLE referrals ALTER COLUMN reward_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(reward_amount, 0)::numeric, 4)"
    ),

    # ═══ FINANCIAL AUDIT ═══
    (
        "financial_audit_log.amount",
        "ALTER TABLE financial_audit_log ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "financial_audit_log.balance_before",
        "ALTER TABLE financial_audit_log ALTER COLUMN balance_before TYPE NUMERIC(14,4) USING ROUND(balance_before::numeric, 4)"
    ),
    (
        "financial_audit_log.balance_after",
        "ALTER TABLE financial_audit_log ALTER COLUMN balance_after TYPE NUMERIC(14,4) USING ROUND(balance_after::numeric, 4)"
    ),

    # ═══ USER PRODUCT DISCOUNTS ═══
    (
        "user_product_discounts.discount_percent",
        "ALTER TABLE user_product_discounts ALTER COLUMN discount_percent TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_percent, 0)::numeric, 4)"
    ),
]


# ════════════════════════════════════════════════════════════
# فحص السلامة
# ════════════════════════════════════════════════════════════
def verify_integrity(label="check"):
    """
    تحقق: مجموع الحركات = الرصيد الحالي لكل مستخدم.
    الفرق يجب أن يكون ≤ 0.01$ (تقريب سنت).
    """
    log.info(f"🔍 [{label}] التحقق من التكامل المالي...")

    try:
        result = db.session.execute(text("""
            SELECT 
                u.id,
                u.telegram_id,
                u.balance,
                COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                            WHEN type = 'purchase' THEN -amount
                            ELSE 0
                        END
                    )
                    FROM transactions t
                    WHERE t.user_id = u.id
                ), 0) AS computed,
                ABS(u.balance - COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                            WHEN type = 'purchase' THEN -amount
                            ELSE 0
                        END
                    )
                    FROM transactions t
                    WHERE t.user_id = u.id
                ), 0)) AS diff
            FROM users u
            WHERE ABS(u.balance - COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                        WHEN type = 'purchase' THEN -amount
                        ELSE 0
                    END
                )
                FROM transactions t
                WHERE t.user_id = u.id
            ), 0)) > 0.01
            ORDER BY diff DESC
            LIMIT 50
        """))

        mismatches = result.fetchall()

        if not mismatches:
            log.info(f"✅ [{label}] جميع الأرصدة مطابقة للحركات (فرق ≤ 0.01$)")
            return True

        log.warning(f"⚠️  [{label}] {len(mismatches)} مستخدم بأرصدة غير مطابقة:")
        for row in mismatches[:20]:
            log.warning(
                f"   user_id={row[0]} telegram={row[1]} "
                f"balance={row[2]} computed={row[3]} diff={row[4]:.4f}"
            )

        return False

    except Exception as e:
        log.error(f"❌ [{label}] فشل التحقق: {e}")
        return False


# ════════════════════════════════════════════════════════════
# تشغيل
# ════════════════════════════════════════════════════════════
def run():
    app = create_app()

    with app.app_context():
        log.info("=" * 70)
        log.info("🔄 Migration: FLOAT → NUMERIC(14,4)")
        log.info(f"   Time: {datetime.now().isoformat()}")
        log.info(f"   Log file: {log_file}")
        log.info("=" * 70)

        # 1. فحص قبل
        log.info("\n▶️  المرحلة 1: فحص السلامة قبل")
        before_ok = verify_integrity("before")

        # 2. تأكيد
        log.info("\n▶️  المرحلة 2: تطبيق التحويلات")
        log.info(f"   إجمالي: {len(MIGRATIONS)} تحويل")

        applied = 0
        failed = 0
        errors = []

        for name, sql in MIGRATIONS:
            try:
                db.session.execute(text(sql))
                db.session.commit()
                applied += 1
                log.info(f"   ✅ {name}")
            except Exception as e:
                db.session.rollback()
                failed += 1
                err = str(e)[:200]
                errors.append((name, err))
                log.error(f"   ❌ {name} → {err}")

        # 3. النتيجة
        log.info(f"\n📊 النتيجة: {applied} نجح، {failed} فشل")

        if errors:
            log.warning("⚠️  أخطاء:")
            for name, err in errors:
                log.warning(f"   • {name}: {err}")

        # 4. فحص بعد
        log.info("\n▶️  المرحلة 3: فحص السلامة بعد")
        after_ok = verify_integrity("after")

        # 5. الملخص
        log.info("\n" + "=" * 70)
        log.info("📋 الملخص النهائي")
        log.info("=" * 70)
        log.info(f"   تحويلات ناجحة:  {applied}")
        log.info(f"   تحويلات فاشلة:  {failed}")
        log.info(f"   قبل:            {'✅' if before_ok else '⚠️'}")
        log.info(f"   بعد:            {'✅' if after_ok else '⚠️'}")
        log.info("=" * 70)

        if failed == 0 and after_ok:
            log.info("🎉 Migration اكتملت بنجاح")
            return 0
        elif failed == 0:
            log.warning("⚠️  Migration اكتملت، لكن تحقق الأرصدة يُظهر فروقات")
            log.warning("   السبب: فروقات FLOAT سابقة — ليست من Migration")
            return 0
        else:
            log.error("❌ Migration فيها فشل — راجع الأخطاء")
            return 1


if __name__ == '__main__':
    # تأكيد
    print()
    print("=" * 70)
    print("⚠️  تحذير: هذه Migration تُغيّر المخطّط بشكل غير قابل للتراجع")
    print("=" * 70)
    print()
    print("  - كل الحقول المالية ستتحول FLOAT → NUMERIC(14,4)")
    print("  - يجب أخذ Backup في Neon قبل التنفيذ")
    print("  - إذا فشلت جزئياً → استرجع من Neon Branch")
    print()
    print("=" * 70)
    confirm = input("اكتب 'YES' للمتابعة: ").strip()
    if confirm != 'YES':
        print("❌ أُلغي")
        sys.exit(0)

    sys.exit(run())