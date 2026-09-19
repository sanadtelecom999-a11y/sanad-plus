# ============================================================
# 🔄 Migration: Base64 → Cloudinary URLs
# ============================================================
"""
يحوّل كل الصور الموجودة في DB من base64 إلى Cloudinary URLs.

يشمل الجداول:
   - categories.image
   - products.image
   - payment_methods.icon
   - payment_methods.qr_image

آمن للتشغيل عدة مرات (idempotent):
   ✅ يرفع فقط base64 (يتجاهل http URLs)
   ✅ يُظهر progress
   ✅ لا يحذف البيانات عند الفشل
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.base import Category, Product, PaymentMethod
from app.services.cloudinary_service import upload_base64_image, is_enabled


def migrate_table(model, field_name, folder, label):
    """يُرحّل حقل صور في جدول معين"""
    print(f"\n{'='*60}")
    print(f"📋 {label}")
    print(f"{'='*60}")

    rows = model.query.all()
    total = len(rows)

    if total == 0:
        print(f"   لا توجد صفوف")
        return 0, 0

    migrated = 0
    skipped = 0
    failed = 0

    for idx, row in enumerate(rows, 1):
        value = getattr(row, field_name, None)

        if not value:
            skipped += 1
            continue

        # إذا URL جاهز — تخطى
        if isinstance(value, str) and (
            value.startswith("http://") or value.startswith("https://")
        ):
            skipped += 1
            continue

        # إذا base64 — ارفعه
        if isinstance(value, str) and value.startswith("data:image/"):
            print(f"   [{idx}/{total}] رفع صورة (row id={row.id})... ", end="", flush=True)
            url = upload_base64_image(value, folder=folder)

            if url and url.startswith("http"):
                setattr(row, field_name, url)
                db.session.flush()
                migrated += 1
                print(f"✅")
            else:
                failed += 1
                print(f"❌ فشل")
        else:
            skipped += 1

    return migrated, skipped, failed


def main():
    app = create_app()

    with app.app_context():
        # تحقق من Cloudinary
        if not is_enabled():
            print("❌ Cloudinary غير معد")
            print("   تأكد من:")
            print("   - CLOUDINARY_CLOUD_NAME")
            print("   - CLOUDINARY_API_KEY")
            print("   - CLOUDINARY_API_SECRET")
            sys.exit(1)

        print("=" * 60)
        print("🔄 Migration: Base64 → Cloudinary")
        print("=" * 60)

        stats = {
            "categories": (0, 0, 0),
            "products": (0, 0, 0),
            "payment_icons": (0, 0, 0),
            "payment_qr": (0, 0, 0),
        }

        # 1. Categories
        stats["categories"] = migrate_table(
            Category, "image", "sanad/categories", "📁 Categories"
        )

        # 2. Products
        stats["products"] = migrate_table(
            Product, "image", "sanad/products", "📦 Products"
        )

        # 3. Payment Methods — Icon
        stats["payment_icons"] = migrate_table(
            PaymentMethod, "icon", "sanad/payment-methods", "💳 Payment Icons"
        )

        # 4. Payment Methods — QR
        stats["payment_qr"] = migrate_table(
            PaymentMethod, "qr_image", "sanad/qr-codes", "🔲 Payment QRs"
        )

        # Commit نهائي
        try:
            db.session.commit()
            print("\n" + "=" * 60)
            print("✅ اكتملت Migration بنجاح")
            print("=" * 60)

            total_migrated = 0
            total_skipped = 0
            total_failed = 0

            for name, (m, s, f) in stats.items():
                total_migrated += m
                total_skipped += s
                total_failed += f
                print(f"   {name:20s} → ✅ {m:3d}  ⏭️  {s:3d}  ❌ {f:3d}")

            print(f"   {'─'*45}")
            print(f"   {'الإجمالي':20s} → ✅ {total_migrated:3d}  ⏭️  {total_skipped:3d}  ❌ {total_failed:3d}")

            if total_failed > 0:
                print(f"\n⚠️  {total_failed} صورة فشلت — تحقق من Cloudinary quota")
                print("   (الصور الأصلية محفوظة — لا ضرر)")
            else:
                print("\n🎉 كل الصور رُفعت بنجاح!")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ فشل Commit: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()