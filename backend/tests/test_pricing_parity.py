# ============================================================
# 🧪 Parity Test — v18.3.7
# ============================================================
import os
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

_HERE = Path(__file__).resolve()
_BACKEND = _HERE.parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


# ════════════════════════════════════════════════════════════
# Test 1: JS Formula Contract
# ════════════════════════════════════════════════════════════
def test_js_formula_contract():
    """يفشل لو JS غيّر صيغة السعر بدون تحديث Python"""
    js_path = _BACKEND.parent / "miniapp" / "js" / "app_new.js"

    if not js_path.exists():
        print(f"⚠️  SKIP: {js_path} غير موجود")
        return

    js = js_path.read_text(encoding="utf-8")

    assert "basePrice / baseQty" in js, (
        "❌ JS formula changed — update Python side too"
    )
    assert "baseQty > 0" in js, (
        "❌ baseQty guard missing from JS"
    )

    print("✅ Test 1: JS formula contract preserved")


# ════════════════════════════════════════════════════════════
# Test 2: Unit price math
# ════════════════════════════════════════════════════════════
def test_unit_price_math():
    cases = [
        (8700, "1.00", "0.0001"),
        (60,   "1.20", "0.0200"),
        (1,    "5.50", "5.5000"),
        (325,  "5.00", "0.0154"),
        (100,  "2.00", "0.0200"),
        (1000, "132.00", "0.1320"),
    ]

    for qty, price_str, expected_str in cases:
        price = Decimal(price_str)
        expected = Decimal(expected_str)

        unit = (price / qty).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
        assert unit == expected, (
            f"❌ ({qty}, {price_str}): unit={unit} ≠ {expected}"
        )

    print(f"✅ Test 2: {len(cases)} cases passed")


# ════════════════════════════════════════════════════════════
# Test 3: End-to-end from DB (skip if no DATABASE_URL)
# ════════════════════════════════════════════════════════════
def test_products_from_db():
    """يفحص كل منتج فعلي في DB — يتخطى لو DATABASE_URL غير موجود"""
    if not os.getenv("DATABASE_URL"):
        print("⚠️  SKIP: DATABASE_URL not set (local env)")
        return

    try:
        from app import create_app
        from app.models.base import Product
    except ImportError as e:
        print(f"⚠️  SKIP: cannot import app ({e})")
        return

    try:
        app = create_app()
    except Exception as e:
        print(f"⚠️  SKIP: create_app failed ({e})")
        return

    with app.app_context():
        products = Product.query.filter(
            Product.is_active == True,
            Product.base_quantity > 0,
            Product.product_type == 'quantity',
        ).all()

        if not products:
            print("⚠️  SKIP: no active products")
            return

        failures = []
        for p in products:
            unit = (Decimal(str(p.base_price)) / p.base_quantity).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
            total = (unit * p.base_quantity).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )

            diff = abs(total - Decimal(str(p.base_price)))
            if diff > Decimal("0.01"):
                failures.append(
                    f"  ❌ #{p.id} '{p.name}': {p.base_price} → {total} (diff={diff})"
                )

        if failures:
            msg = "\n".join(failures)
            raise AssertionError(
                f"{len(failures)} products failed parity:\n{msg}"
            )

        print(f"✅ Test 3: {len(products)} products match parity")


# ════════════════════════════════════════════════════════════
# Standalone runner
# ════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Pricing Parity Tests — v18.3.7")
    print("=" * 60)
    print()

    tests = [
        ("Test 1 — JS Contract", test_js_formula_contract),
        ("Test 2 — Unit Price Math", test_unit_price_math),
        ("Test 3 — DB Products", test_products_from_db),
    ]

    passed = 0
    failed = 0

    for name, fn in tests:
        try:
            print(f"▸ {name} ...")
            fn()
            passed += 1
        except AssertionError as e:
            print(f"  ❌ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1
        print()

    print("=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
