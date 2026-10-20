"""Admin Products & Categories Routes - Extracted from admin.py"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import User, Order, Product, Category, Deposit, PaymentMethod, KYCRequest, Notification, ServiceRequest, Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, AdminActivity, ProductBundle, UserProductDiscount, AdminOTPSession, log_financial
from ..services.cloudinary_service import upload_base64_image, get_signed_url
from ..services.cache_service import invalidate_categories, invalidate_products, invalidate_admin, cache_get
from . import main
from .admin_utils import is_admin_user, handle_errors
from app.middleware import admin_required
from .admin import log_admin_activity, get_arabic_status, serialize_bundle, _normalize_image
from flask_jwt_extended import jwt_required, get_jwt_identity
from decimal import Decimal

@main.route("/admin/api/categories", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_categories():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        # 🚀 Cache
        cached = cache_get(key_admin_list("categories"))
        if cached is not None:
            return jsonify(cached)

        categories = Category.query.filter_by(is_active=True).order_by(Category.display_order).all()
        result = [{
            "id": c.id, "name": c.name, "description": c.description,
            "image": c.image, "is_active": c.is_active, "display_order": c.display_order,
        } for c in categories]

        cache_set(key_admin_list("categories"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    # POST
    data = request.get_json() or {}
    image_url = _normalize_image(data.get("image", ""), folder="sanad/categories")

    cat = Category(
        name=data.get("name"), description=data.get("description", ""),
        image=image_url, is_active=data.get("is_active", True),
        display_order=data.get("display_order", 0),
    )
    db.session.add(cat)
    log_admin_activity(f"إضافة قسم: {cat.name}")
    db.session.commit()
    return jsonify({"id": cat.id}), 201

@main.route("/admin/api/categories/<int:cat_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404

    cat_name = cat.name
    cat.is_active = False
    cat.deleted_at = datetime.now(timezone.utc)
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = False
        product.deleted_at = datetime.now(timezone.utc)

    log_admin_activity(f"أرشفة قسم: {cat_name}")
    db.session.commit()
    return jsonify({"success": True, "message": f"تم أرشفة القسم و{len(products)} منتج"})

@main.route("/admin/api/categories/<int:cat_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404
    cat.is_active = True
    cat.deleted_at = None
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = True
        product.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": f"تم استرجاع القسم و{len(products)} منتج"})

# ============================================================
# Products — 🆕 v18.1: cached + eager bundles
# ============================================================

@main.route("/admin/api/products", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_products():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        # 🚀 Cache
        cached = cache_get(key_admin_list("products"))
        if cached is not None:
            return jsonify(cached)

        # 🚀 Eager load bundles (avoids N+1)
        products = (
            Product.query
            .filter_by(is_active=True)
            .options(selectinload(Product.bundles))
            .all()
        )

        result = []
        for p in products:
            active_bundles = sorted(
                [b for b in p.bundles if b.is_active],
                key=lambda x: x.price_usd
            )
            result.append({
                "id": p.id, "category_id": p.category_id, "name": p.name,
                "description": p.description, "image": p.image,
                "product_type": p.product_type, "base_quantity": p.base_quantity,
                "base_price": p.base_price, "unit_name": p.unit_name or "قطعة",
                "input_type": p.input_type, "custom_input_label": p.custom_input_label,
                "stock": p.stock, "max_quantity": p.max_quantity,
                "is_bundle": p.is_bundle, "is_active": p.is_active,
                "bundles": [serialize_bundle(b) for b in active_bundles],
            })

        cache_set(key_admin_list("products"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    # POST — إنشاء منتج
    data = request.get_json() or {}
    stock = data.get("stock")
    if stock is not None:
        try:
            stock = int(stock) if int(stock) > 0 else None
        except (ValueError, TypeError):
            stock = None

    image_url = _normalize_image(data.get("image", ""), folder="sanad/products")

    input_type = data.get("input_type", "id")
    if input_type not in ("id", "account_id", "phone", "url", "none"):
        input_type = "id"

    product = Product(
        category_id=data.get("category_id"), name=data.get("name"),
        description=data.get("description", ""), image=image_url,
        product_type=data.get("product_type", "quantity"),
        base_quantity=data.get("base_quantity", 0),
        base_price=data.get("base_price", 0.0),
        unit_name=(data.get("unit_name") or "قطعة").strip() or "قطعة",
        input_type=input_type,
        custom_input_label=data.get("custom_input_label", ""),
        stock=stock,
        max_quantity=data.get("max_quantity", 0),
        is_bundle=(data.get("product_type") == "bundle"),
        is_active=data.get("is_active", True),
    )
    db.session.add(product)
    db.session.flush()

    if product.product_type == "bundle":
        for b in data.get("bundles", []):
            name = (b.get("name") or "").strip()
            try:
                price = float(b.get("price_usd", 0))
                qty = int(b.get("quantity", 0))
            except (ValueError, TypeError):
                continue
            if not name or price <= 0:
                continue
            db.session.add(ProductBundle(
                product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
            ))

    log_admin_activity(f"إضافة منتج: {product.name}")
    db.session.commit()
    return jsonify({"id": product.id}), 201

@main.route("/admin/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_product_actions(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product.id).order_by(ProductBundle.price_usd).all()
        return jsonify({
            "id": product.id, "category_id": product.category_id, "name": product.name,
            "description": product.description, "image": product.image,
            "product_type": product.product_type, "base_quantity": product.base_quantity,
            "base_price": product.base_price, "unit_name": product.unit_name or "قطعة",
            "input_type": product.input_type, "custom_input_label": product.custom_input_label,
            "stock": product.stock, "max_quantity": product.max_quantity,
            "is_bundle": product.is_bundle, "is_active": product.is_active,
            "bundles": [serialize_bundle(b) for b in bundles],
        })

    if request.method == "PUT":
        data = request.get_json() or {}
        ALLOWED = {"name", "description", "image", "category_id", "product_type",
                   "base_quantity", "base_price", "unit_name", "input_type",
                   "custom_input_label", "stock", "max_quantity", "is_bundle", "is_active"}
        for key, value in data.items():
            if key in ALLOWED and hasattr(product, key):
                if key == "stock":
                    try:
                        value = int(value) if value is not None and int(value) > 0 else None
                    except (ValueError, TypeError):
                        value = None
                if key == "unit_name":
                    value = (value or "قطعة").strip() or "قطعة"
                if key == "image":
                    value = _normalize_image(value, folder="sanad/products")
                if key == "input_type":
                    if value not in ("id", "account_id", "phone", "url", "none"):
                        value = "id"
                setattr(product, key, value)

        if "bundles" in data:
            ProductBundle.query.filter_by(product_id=product.id).delete()
            for b in data.get("bundles", []):
                name = (b.get("name") or "").strip()
                try:
                    price = float(b.get("price_usd", 0))
                    qty = int(b.get("quantity", 0))
                except (ValueError, TypeError):
                    continue
                if not name or price <= 0:
                    continue
                db.session.add(ProductBundle(
                    product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
                ))
            product.is_bundle = (product.product_type == "bundle")

        log_admin_activity(f"تعديل المنتج: {product.name}")
        db.session.commit()
        return jsonify({"success": True, "message": "تم تعديل المنتج"})

    # DELETE
    product_name = product.name
    product.is_active = False
    product.deleted_at = datetime.now(timezone.utc)
    log_admin_activity(f"أرشفة المنتج: {product_name}")
    db.session.commit()
    return jsonify({"success": True, "message": "تم أرشفة المنتج"})

@main.route("/admin/api/products/<int:product_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_product(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404
    product.is_active = True
    product.deleted_at = None
    if product.category and not product.category.is_active:
        product.category.is_active = True
        product.category.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": "تم استرجاع المنتج"})

# ============================================================
# Bundles
# ============================================================

@main.route("/admin/api/products/<int:product_id>/bundles", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_bundles(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product_id).order_by(ProductBundle.price_usd).all()
        return jsonify([serialize_bundle(b) for b in bundles])

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    try:
        price = float(data.get("price_usd", 0))
        qty = int(data.get("quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "بيانات غير صالحة"}), 400

    if not name or price <= 0:
        return jsonify({"error": "بيانات ناقصة"}), 400

    bundle = ProductBundle(product_id=product_id, name=name, quantity=qty, price_usd=price, is_active=True)
    db.session.add(bundle)
    db.session.commit()
    return jsonify(serialize_bundle(bundle)), 201

@main.route("/admin/api/products/<int:product_id>/bundles/<int:bundle_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_bundle_actions(product_id, bundle_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    bundle = ProductBundle.query.filter_by(id=bundle_id, product_id=product_id).first()
    if not bundle:
        return jsonify({"error": "باقة غير موجودة"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        if "name" in data and (data.get("name") or "").strip():
            bundle.name = data["name"].strip()
        if "quantity" in data:
            try: bundle.quantity = int(data["quantity"])
            except (ValueError, TypeError): pass
        if "price_usd" in data:
            try:
                p = float(data["price_usd"])
                if p > 0: bundle.price_usd = p
            except (ValueError, TypeError): pass
        if "is_active" in data:
            bundle.is_active = bool(data["is_active"])
        db.session.commit()
        return jsonify(serialize_bundle(bundle))

    db.session.delete(bundle)
    db.session.commit()
    return jsonify({"success": True})

# ============================================================
# 💳 Payment Methods — v18.3.6
def _serialize_payment_method(m):
    return {
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "account_name": m.account_name,
        "account": m.account,
        "icon": m.icon,
        "qr_image": m.qr_image,
        "min_amount": float(m.min_amount or 0),
        "max_amount": float(m.max_amount or 500),
        "fee": float(m.fee or 0),
        "fee_type": getattr(m, "fee_type", None) or "percentage",
        "requires_kyc": m.requires_kyc,
        "is_active": m.is_active,
    }

def _validate_payment_method_data(data, current=None):
    try:
        min_amt = float(data.get("min_amount", current.min_amount if current else 0) or 0)
        max_amt = float(data.get("max_amount", current.max_amount if current and current.max_amount else 500) or 500)
        fee_val = float(data.get("fee", current.fee if current else 0) or 0)
    except (ValueError, TypeError):
        return None, "قيم رقمية غير صحيحة"

    if min_amt < 0 or max_amt < 0 or fee_val < 0:
        return None, "لا يمكن أن تكون القيم سالبة"
    if max_amt > 0 and min_amt > max_amt:
        return None, "الحد الأدنى أكبر من الحد الأقصى"

    fee_type = data.get("fee_type", getattr(current, "fee_type", None) if current else "percentage")
    if fee_type not in ("percentage", "fixed"):
        fee_type = "percentage"
    if fee_type == "percentage" and fee_val > 100:
        return None, "نسبة الرسوم يجب أن تكون 100% أو أقل"

    return {"min_amount": min_amt, "max_amount": max_amt, "fee": fee_val, "fee_type": fee_type}, None