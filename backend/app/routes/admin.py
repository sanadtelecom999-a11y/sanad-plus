import os
import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models.base import User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod, KYCRequest, Notification, Setting, AdminActivity, ServiceRequest, Transaction
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

def is_admin_user(identity):
    return identity == "admin"

def get_arabic_status(status):
    status_map = {
        "pending": "قيد المعالجة",
        "review": "قيد المراجعة",
        "processing": "قيد التنفيذ",
        "completed": "مكتمل",
        "failed": "فشل",
        "cancelled": "ملغي"
    }
    return status_map.get(status, status)

@main.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = create_access_token(identity="admin")
        return jsonify({"token": token}), 200
    return jsonify({"error": "بيانات غير صحيحة"}), 401

@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
def admin_get_users():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "telegram_id": u.telegram_id,
        "username": u.username,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "balance": u.balance,
        "kyc_status": u.kyc_status,
        "is_verified": u.is_verified,
        "role": u.role,
        "is_banned": u.is_banned,
        "vip_level": u.vip_level,
        "referral_code": u.referral_code,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users])

@main.route("/admin/api/users/<int:user_id>/kyc", methods=["POST"])
@jwt_required()
def admin_toggle_kyc(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    new_status = data.get("status")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    if new_status == "verified":
        user.kyc_status = "verified"
        user.is_verified = True
    elif new_status == "unverified":
        user.kyc_status = "unverified"
        user.is_verified = False
    db.session.commit()
    notify_admins(f"🔄 تم تغيير حالة توثيق المستخدم {user.telegram_id} إلى {new_status}")
    return jsonify({"kyc_status": user.kyc_status, "is_verified": user.is_verified})

@main.route("/admin/api/users/<int:user_id>/balance", methods=["POST"])
@jwt_required()
def admin_adjust_balance(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    amount = float(data.get("amount", 0))
    note = data.get("note", "")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.balance += amount

    deposit = Deposit(
        user_id=user.id,
        amount=amount,
        currency="USD",
        method="إيداع يدوي",
        status="approved",
        transaction_id="ADJ-" + uuid.uuid4().hex[:8].upper(),
        created_at=datetime.now(timezone.utc),
        admin_note=note,
    )
    db.session.add(deposit)

    txn = Transaction(
        user_id=user.id,
        type="adjustment",
        amount=amount,
        balance_after=user.balance,
        reference_type="admin_adjustment",
        reference_id=user.id,
    )
    db.session.add(txn)

    notif = Notification(
        user_id=user.id,
        title="تعديل الرصيد",
        message=f"تم تعديل رصيدك بمقدار {amount}$" + (f" ({note})" if note else ""),
        type="info",
    )
    db.session.add(notif)

    db.session.commit()

    send_telegram_notification(user.telegram_id, f"تم تعديل رصيدك بمقدار {amount}$")
    notify_admins(f"💵 تم تعديل رصيد المستخدم {user.telegram_id} بمقدار {amount}$")

    return jsonify({"balance": user.balance})

@main.route("/admin/api/users/<int:user_id>/ban", methods=["POST"])
@jwt_required()
def admin_ban_user(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.is_banned = not user.is_banned
    db.session.commit()
    notify_admins(f"🚫 تم تغيير حالة الحظر للمستخدم {user.telegram_id} إلى {user.is_banned}")
    return jsonify({"is_banned": user.is_banned})

@main.route("/admin/api/users/<int:user_id>/vip", methods=["POST"])
@jwt_required()
def admin_set_vip(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    vip_level = int(data.get("vip_level", 0))
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.vip_level = vip_level
    db.session.commit()
    notify_admins(f"⭐ تم تغيير VIP المستخدم {user.telegram_id} إلى {vip_level}")
    return jsonify({"vip_level": user.vip_level})

@main.route("/admin/api/categories", methods=["GET", "POST"])
@jwt_required()
def admin_categories():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        categories = Category.query.all()
        return jsonify([{
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "image": c.image,
            "is_active": c.is_active,
            "order": c.order,
        } for c in categories])
    else:
        data = request.get_json()
        cat = Category(
            name=data.get("name"),
            description=data.get("description", ""),
            image=data.get("image", ""),
            is_active=data.get("is_active", True),
            order=data.get("order", 0),
        )
        db.session.add(cat)
        db.session.commit()
        notify_admins(f"🗂️ تم إضافة قسم جديد: {cat.name}")
        return jsonify({"id": cat.id}), 201

@main.route("/admin/api/categories/<int:cat_id>", methods=["DELETE"])
@jwt_required()
def admin_delete_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404

    try:
        products = Product.query.filter_by(category_id=cat_id).all()
        for product in products:
            ProductBundle.query.filter_by(product_id=product.id).delete()
            Order.query.filter_by(product_id=product.id).delete()
            db.session.delete(product)

        db.session.delete(cat)
        db.session.commit()
        notify_admins(f"🗑️ تم حذف القسم: {cat.name}")
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل حذف القسم: {str(e)}"}), 500

@main.route("/admin/api/products", methods=["GET", "POST"])
@jwt_required()
def admin_products():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        products = Product.query.all()
        return jsonify([{
            "id": p.id,
            "category_id": p.category_id,
            "name": p.name,
            "description": p.description,
            "image": p.image,
            "product_type": p.product_type,
            "base_quantity": p.base_quantity,
            "base_price": p.base_price,
            "unit_name": p.unit_name,
            "input_type": p.input_type,
            "custom_input_label": p.custom_input_label,
            "stock": p.stock,
            "is_bundle": p.is_bundle,
            "is_active": p.is_active,
        } for p in products])
    else:
        data = request.get_json()
        product = Product(
            category_id=data.get("category_id"),
            name=data.get("name"),
            description=data.get("description", ""),
            image=data.get("image", ""),
            product_type=data.get("product_type", "quantity"),
            base_quantity=data.get("base_quantity", 0),
            base_price=data.get("base_price", 0.0),
            unit_name=data.get("unit_name", "قطعة"),
            input_type=data.get("input_type", "id"),
            custom_input_label=data.get("custom_input_label", ""),
            stock=data.get("stock", 0),
            is_bundle=data.get("is_bundle", False),
            is_active=data.get("is_active", True),
        )
        db.session.add(product)
        db.session.commit()
        notify_admins(f"📦 تم إضافة منتج جديد: {product.name}")
        return jsonify({"id": product.id}), 201

@main.route("/admin/api/products/<int:product_id>", methods=["PUT", "DELETE"])
@jwt_required()
def admin_product_actions(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404
    if request.method == "PUT":
        data = request.get_json()
        for key, value in data.items():
            if hasattr(product, key):
                setattr(product, key, value)
        db.session.commit()
        notify_admins(f"✏️ تم تعديل المنتج: {product.name}")
        return jsonify({"success": True})
    elif request.method == "DELETE":
        try:
            ProductBundle.query.filter_by(product_id=product.id).delete()
            Order.query.filter_by(product_id=product.id).delete()
            db.session.delete(product)
            db.session.commit()
            notify_admins(f"🗑️ تم حذف المنتج: {product.name}")
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"فشل حذف المنتج: {str(e)}"}), 500

@main.route("/admin/api/products/<int:product_id>/bundles", methods=["GET", "POST"])
@jwt_required()
def admin_bundles(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product_id).all()
        return jsonify([{
            "id": b.id,
            "name": b.name,
            "quantity": b.quantity,
            "price_usd": b.price_usd,
            "is_active": b.is_active,
        } for b in bundles])
    else:
        data = request.get_json()
        bundle = ProductBundle(
            product_id=product_id,
            name=data.get("name"),
            quantity=data.get("quantity"),
            price_usd=data.get("price_usd"),
            is_active=data.get("is_active", True),
        )
        db.session.add(bundle)
        db.session.commit()
        notify_admins(f"📦 تم إضافة باقة: {bundle.name}")
        return jsonify({"id": bundle.id}), 201

@main.route("/admin/api/payment-methods", methods=["GET", "POST"])
@jwt_required()
def admin_payment_methods():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        methods = PaymentMethod.query.all()
        return jsonify([{
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "account_name": m.account_name,
            "account": m.account,
            "icon": m.icon,
            "qr_image": m.qr_image,
            "min_amount": m.min_amount,
            "fee": m.fee,
            "requires_kyc": m.requires_kyc,
            "is_active": m.is_active,
        } for m in methods])
    else:
        data = request.get_json()
        method = PaymentMethod(
            name=data.get("name"),
            description=data.get("description", ""),
            account_name=data.get("account_name", ""),
            account=data.get("account", ""),
            icon=data.get("icon", ""),
            qr_image=data.get("qr_image", ""),
            min_amount=data.get("min_amount", 0),
            fee=data.get("fee", 0),
            requires_kyc=data.get("requires_kyc", False),
            is_active=data.get("is_active", True),
        )
        db.session.add(method)
        db.session.commit()
        notify_admins(f"💳 تم إضافة طريقة دفع: {method.name}")
        return jsonify({"id": method.id}), 201

@main.route("/admin/api/payment-methods/<int:method_id>", methods=["DELETE"])
@jwt_required()
def admin_delete_payment_method(method_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({"error": "طريقة دفع غير موجودة"}), 404
    db.session.delete(method)
    db.session.commit()
    notify_admins(f"🗑️ تم حذف طريقة دفع: {method.name}")
    return jsonify({"success": True})

@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
def admin_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    orders = Order.query.order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        product = Product.query.get(o.product_id)
        product_name = product.name if product else "منتج محذوف"
        result.append({
            "id": o.id,
            "order_number": o.order_number,
            "user_id": o.user_id,
            "product_id": o.product_id,
            "product_name": product_name,
            "quantity": o.quantity,
            "unit_price": o.unit_price,
            "total_price": o.total_price,
            "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return jsonify(result)

@main.route("/admin/api/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def admin_order_detail(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    product = Product.query.get(order.product_id)
    return jsonify({
        "id": order.id,
        "order_number": order.order_number,
        "user_id": order.user_id,
        "product_id": order.product_id,
        "product_name": product.name if product else "منتج محذوف",
        "quantity": order.quantity,
        "unit_price": order.unit_price,
        "total_price": order.total_price,
        "status": order.status,
        "status_arabic": get_arabic_status(order.status),
        "delivery_data": order.delivery_data,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })

@main.route("/admin/api/orders/<int:order_id>/status", methods=["POST"])
@jwt_required()
def admin_update_order_status(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    new_status = data.get("status")
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    user = User.query.get(order.user_id)
    if user:
        status_arabic = get_arabic_status(new_status)
        notif = Notification(
            user_id=user.id,
            title="تحديث حالة الطلب",
            message=f"طلبك {order.order_number} أصبح {status_arabic}",
            type="info",
        )
        db.session.add(notif)
        db.session.commit()
        send_telegram_notification(user.telegram_id, f"طلبك {order.order_number} أصبح {status_arabic}")

    notify_admins(f"🔄 طلب {order.order_number} أصبح {get_arabic_status(new_status)}")

    return jsonify({"status": order.status, "message": f"تم تحديث الحالة إلى {get_arabic_status(new_status)}"})

@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
def admin_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id,
        "user_id": d.user_id,
        "amount": d.amount,
        "method": d.method,
        "proof_image": d.proof_image,
        "status": d.status,
        "transaction_id": d.transaction_id,
        "admin_note": d.admin_note,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in deposits])

@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST"])
@jwt_required()
def admin_approve_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status == "pending":
        deposit.status = "approved"
        user = User.query.get(deposit.user_id)
        if user:
            user.balance += deposit.amount
            txn = Transaction(
                user_id=user.id,
                type="deposit",
                amount=deposit.amount,
                balance_after=user.balance,
                reference_type="deposit",
                reference_id=deposit.id,
            )
            db.session.add(txn)
            notif = Notification(user_id=user.id, title="إيداع مقبول", message=f"تم قبول إيداعك بقيمة {deposit.amount}$", type="success")
            db.session.add(notif)
            db.session.commit()
            send_telegram_notification(user.telegram_id, f"تم قبول إيداعك بقيمة {deposit.amount}$")
    notify_admins(f"✅ تم قبول إيداع بقيمة {deposit.amount}$ للمستخدم {deposit.user_id}")
    return jsonify({"status": deposit.status})

@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST"])
@jwt_required()
def admin_reject_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    deposit.status = "rejected"
    db.session.commit()
    user = User.query.get(deposit.user_id)
    if user:
        notif = Notification(user_id=user.id, title="إيداع مرفوض", message=f"تم رفض إيداعك بقيمة {deposit.amount}$", type="warning")
        db.session.add(notif)
        db.session.commit()
        send_telegram_notification(user.telegram_id, f"تم رفض إيداعك بقيمة {deposit.amount}$")
    notify_admins(f"❌ تم رفض إيداع بقيمة {deposit.amount}$ للمستخدم {deposit.user_id}")
    return jsonify({"status": deposit.status})

@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
def admin_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kycs = KYCRequest.query.order_by(KYCRequest.submitted_at.desc()).all()
    return jsonify([{
        "id": k.id,
        "user_id": k.user_id,
        "full_name": k.full_name,
        "phone": k.phone,
        "address": k.address,
        "selfie_image": k.selfie_image,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs])

@main.route("/admin/api/kyc/<int:kyc_id>/approve", methods=["POST"])
@jwt_required()
def admin_approve_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404
    kyc.status = "approved"
    kyc.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "verified"
        user.is_verified = True
        notif = Notification(user_id=user.id, title="تم توثيق حسابك", message="تم قبول طلب التوثيق، حسابك موثق الآن", type="success")
        db.session.add(notif)
        db.session.commit()
        send_telegram_notification(user.telegram_id, "تم توثيق حسابك بنجاح")
    notify_admins(f"✅ تم قبول توثيق المستخدم {kyc.user_id}")
    return jsonify({"status": "approved"})

@main.route("/admin/api/kyc/<int:kyc_id>/reject", methods=["POST"])
@jwt_required()
def admin_reject_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404
    kyc.status = "rejected"
    kyc.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "unverified"
        user.is_verified = False
        notif = Notification(user_id=user.id, title="رفض التوثيق", message="تم رفض طلب التوثيق، يرجى المحاولة لاحقاً", type="warning")
        db.session.add(notif)
        db.session.commit()
        send_telegram_notification(user.telegram_id, "تم رفض طلب التوثيق")
    notify_admins(f"❌ تم رفض توثيق المستخدم {kyc.user_id}")
    return jsonify({"status": "rejected"})

@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
def admin_send_notification():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    target = data.get("target", "all")
    title = data.get("title", "إشعار")
    message = data.get("message", "")
    notif_type = data.get("type", "info")
    if target == "all":
        users = User.query.all()
        for user in users:
            notif = Notification(user_id=user.id, title=title, message=message, type=notif_type)
            db.session.add(notif)
    else:
        user_id = data.get("user_id")
        if user_id:
            notif = Notification(user_id=user_id, title=title, message=message, type=notif_type)
            db.session.add(notif)
    db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/service-requests", methods=["GET"])
@jwt_required()
def admin_service_requests():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    requests = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([{
        "id": r.id,
        "user_id": r.user_id,
        "service_name": r.service_name,
        "description": r.description,
        "estimated_price": r.estimated_price,
        "status": r.status,
        "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in requests])

@main.route("/admin/api/service-requests/<int:req_id>", methods=["PUT"])
@jwt_required()
def admin_update_service_request(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "طلب غير موجود"}), 404
    req.status = data.get("status", req.status)
    req.admin_response = data.get("admin_response", req.admin_response)
    db.session.commit()
    notify_admins(f"🛠️ تم تحديث طلب الخدمة {req.id} إلى {req.status}")
    return jsonify({"success": True})

@main.route("/admin/api/settings", methods=["GET", "PUT"])
@jwt_required()
def admin_settings():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        settings = Setting.query.all()
        return jsonify({s.key: s.value for s in settings})
    else:
        data = request.get_json()
        for key, value in data.items():
            setting = Setting.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
            else:
                new_setting = Setting(key=key, value=str(value))
                db.session.add(new_setting)
        db.session.commit()
        return jsonify({"success": True})
