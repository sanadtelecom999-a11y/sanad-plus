import uuid
import json
from datetime import datetime, timezone, timedelta
from flask import request, jsonify
from sqlalchemy import update as sa_update
from ..models.base import (
    User, Product, ProductBundle, Order, Transaction,
    Notification, Coupon, CouponUsage, Referral
)
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins

REFERRAL_REWARD = 1.0


# ============================================================
# ============ Helpers ============
# ============================================================
def get_or_create_user(telegram_id, first_name="", last_name="", username=""):
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            balance=0.0,
            kyc_status='unverified',
            is_verified=False,
            role='user',
            vip_level=0,
            referral_code=uuid.uuid4().hex[:8].upper(),
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(user)
        db.session.commit()
    return user


def apply_coupon_to_order(user, coupon_code, order_amount):
    """التحقق من الكود وحساب الخصم. تعيد (discount, coupon_obj) أو (0, None)"""
    if not coupon_code:
        return 0, None
    code = coupon_code.strip().upper()
    coupon = Coupon.query.filter_by(code=code).first()
    if not coupon or not coupon.is_active:
        return 0, None
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        return 0, None
    if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
        return 0, None
    if order_amount < coupon.min_amount:
        return 0, None
    existing = CouponUsage.query.filter_by(coupon_id=coupon.id, user_id=user.id).first()
    if existing:
        return 0, None
    if coupon.discount_type == "percentage":
        discount = order_amount * (coupon.discount_value / 100)
        if coupon.max_discount > 0 and discount > coupon.max_discount:
            discount = coupon.max_discount
    else:
        discount = coupon.discount_value
        if discount > order_amount:
            discount = order_amount
    return round(discount, 4), coupon


def complete_referral_if_first_order(user):
    """منح مكافأة الإحالة عند أول طلب للمستخدم"""
    if not user.referred_by:
        return
    order_count = Order.query.filter_by(user_id=user.id).count()
    if order_count != 1:
        return
    referrer = User.query.filter_by(telegram_id=user.referred_by).first()
    if not referrer:
        return
    referral = Referral.query.filter_by(
        referrer_id=referrer.id,
        referred_user_id=user.id,
        status="pending"
    ).first()
    if not referral:
        return
    referrer.balance += REFERRAL_REWARD
    referrer.referral_earnings = (referrer.referral_earnings or 0) + REFERRAL_REWARD
    referrer.referral_count = (referrer.referral_count or 0) + 1
    txn = Transaction(
        user_id=referrer.id,
        type="referral_reward",
        amount=REFERRAL_REWARD,
        balance_after=referrer.balance,
        reference_type="referral",
        reference_id=referral.id,
    )
    db.session.add(txn)
    referral.reward_amount = REFERRAL_REWARD
    referral.status = "completed"
    referral.completed_at = datetime.now(timezone.utc)
    notif = Notification(
        user_id=referrer.id,
        title="مكافأة إحالة",
        message=f"حصلت على مكافأة {REFERRAL_REWARD}$ من إحالة",
        type="success",
    )
    db.session.add(notif)
    send_telegram_notification(referrer.telegram_id, f"🎁 حصلت على مكافأة إحالة بقيمة {REFERRAL_REWARD}$")


# ============================================================
# ============ /api/orders/ — إنشاء طلب ============
# ============================================================
@main.route("/api/orders/", methods=["POST"])
def create_order():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    user = get_or_create_user(telegram_id)
    if user.is_banned:
        return jsonify({"error": "أنت محظور"}), 403

    product_id = data.get("product_id")
    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return jsonify({"error": "منتج غير موجود"}), 404

    # ✅ Idempotency — منع الطلب المكرر
    idempotency_key = data.get("idempotency_key")
    if idempotency_key:
        existing = Order.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "order_id": existing.id,
                "order_number": existing.order_number,
                "status": existing.status,
                "total_price": existing.total_price,
                "message": "طلب مكرر — تم إرجاعه من السجل",
            }), 200

    # ============ التحقق من الحقول المخصصة ============
    delivery_data = {}
    if product.input_type == "id":
        player_id = data.get("player_id", "")
        if not player_id or not str(player_id).strip():
            return jsonify({"error": "يرجى إدخال معرف اللاعب (ID)"}), 400
        # فحص الأرقام فقط
        if not str(player_id).strip().isdigit():
            return jsonify({"error": "يرجى إدخال أرقام فقط في حقل الايدي"}), 400
        delivery_data = {"player_id": str(player_id).strip()}
    elif product.input_type == "account_id":
        account_id = data.get("account_id", "")
        if not account_id or not str(account_id).strip():
            return jsonify({"error": "يرجى إدخال ID الحساب"}), 400
        if not str(account_id).strip().isdigit():
            return jsonify({"error": "يرجى إدخال أرقام فقط في حقل الايدي"}), 400
        delivery_data = {"account_id": str(account_id).strip()}
    elif product.input_type == "phone":
        phone = data.get("phone", "")
        if not phone or not str(phone).strip():
            return jsonify({"error": "يرجى إدخال رقم الهاتف"}), 400
        if not str(phone).strip().isdigit():
            return jsonify({"error": "يرجى إدخال أرقام فقط في رقم الهاتف"}), 400
        delivery_data = {"phone": str(phone).strip()}

    # ============ تحديد السعر والكمية ============
    if product.product_type == "bundle":
        bundle_id = data.get("bundle_id")
        bundle = ProductBundle.query.get(bundle_id)
        if not bundle or bundle.product_id != product.id:
            return jsonify({"error": "باقة غير صالحة"}), 400
        quantity = bundle.quantity
        unit_price = bundle.price_usd
        total_price = unit_price
        delivery_data["bundle_id"] = bundle.id
        delivery_data["bundle_name"] = bundle.name
    else:
        quantity = int(data.get("quantity", 0))
        if quantity <= 0:
            return jsonify({"error": "الكمية غير صالحة"}), 400

        # ✅ الحد الأقصى للكمية
        max_qty = product.max_quantity or 0
        if max_qty > 0 and quantity > max_qty:
            return jsonify({
                "error": f"الحد الأقصى للكمية هو {max_qty:,}"
            }), 400

        # ✅ فحص المخزون
        if product.stock is not None and product.stock > 0 and product.stock < quantity:
            return jsonify({
                "error": f"الكمية المتوفرة فقط {product.stock}"
            }), 400

        # ✅ حساب سعر الوحدة من الكمية الأساسية
        if product.base_quantity > 0:
            unit_price = product.base_price / product.base_quantity
        else:
            unit_price = product.base_price
        total_price = round(unit_price * quantity, 4)

    # ============ تطبيق كود الخصم ============
    coupon_code = (data.get("coupon_code") or "").strip()
    discount_amount = 0
    coupon_obj = None
    if coupon_code:
        discount_amount, coupon_obj = apply_coupon_to_order(user, coupon_code, total_price)
        if coupon_obj:
            total_price = round(total_price - discount_amount, 4)

    # ============ Atomic check + update ============
    result = db.session.execute(
        sa_update(User)
        .where(User.id == user.id, User.balance >= total_price)
        .values(balance=User.balance - total_price)
    )
    if result.rowcount == 0:
        db.session.rollback()
        return jsonify({"error": "رصيد غير كافٍ"}), 400

    db.session.refresh(user)

    # ============ إنشاء الطلب — delivery_data كـ JSON صحيح ============
    order = Order(
        order_number="ORD-" + uuid.uuid4().hex[:8].upper(),
        user_id=user.id,
        product_id=product.id,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        discount_amount=discount_amount,
        coupon_code=coupon_obj.code if coupon_obj else None,
        status="pending",
        delivery_data=json.dumps(delivery_data, ensure_ascii=False),
        idempotency_key=idempotency_key or uuid.uuid4().hex,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.session.add(order)

    txn = Transaction(
        user_id=user.id,
        type="purchase",
        amount=-total_price,
        balance_after=user.balance,
        reference_type="order",
        reference_id=order.id,
    )
    db.session.add(txn)

    notif = Notification(
        user_id=user.id,
        title="طلب جديد",
        message=f"طلبك {order.order_number} قيد المعالجة",
        type="info",
    )
    db.session.add(notif)
    db.session.commit()

    # تسجيل استخدام الكود
    if coupon_obj:
        coupon_obj.used_count = (coupon_obj.used_count or 0) + 1
        usage = CouponUsage(
            coupon_id=coupon_obj.id,
            user_id=user.id,
            order_id=order.id,
            used_at=datetime.now(timezone.utc),
        )
        db.session.add(usage)
        db.session.commit()

    # ✅ خصم المخزون
    if product.stock is not None and product.stock > 0:
        product.stock = max(0, product.stock - quantity)
        db.session.commit()

    # إتمام الإحالة إذا كان أول طلب
    complete_referral_if_first_order(user)

    # إشعارات
    send_telegram_notification(user.telegram_id, f"طلبك {order.order_number} قيد المعالجة")
    notify_admins(
        f"🆕 طلب جديد!\n"
        f"رقم الطلب: {order.order_number}\n"
        f"المنتج: {product.name}\n"
        f"الكمية: {quantity}\n"
        f"الإجمالي: {total_price}$"
    )

    return jsonify({
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total_price": total_price,
        "discount_amount": discount_amount,
        "message": "طلبك قيد المعالجة",
    }), 201


# ============================================================
# ============ /api/orders/<id>/cancel — إلغاء طلب ============
# ============================================================
@main.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404

    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user or user.id != order.user_id:
        return jsonify({"error": "غير مصرح"}), 403

    if order.status != "pending":
        return jsonify({"error": "لا يمكن إلغاء هذا الطلب"}), 400

    # ✅ إصلاح timezone — استخدم created_at المحلي
    creation_time = order.created_at
    if creation_time.tzinfo is None:
        creation_time = creation_time.replace(tzinfo=timezone.utc)
    elapsed = datetime.now(timezone.utc) - creation_time
    if elapsed > timedelta(seconds=120):
        return jsonify({"error": "انتهت مهلة الإلغاء"}), 400

    # ✅ إرجاع المخزون
    product = Product.query.get(order.product_id)
    if product and product.stock is not None and product.stock >= 0:
        product.stock = product.stock + order.quantity

    user.balance += order.total_price
    txn = Transaction(
        user_id=user.id,
        type="refund",
        amount=order.total_price,
        balance_after=user.balance,
        reference_type="order_cancel",
        reference_id=order.id,
    )
    db.session.add(txn)

    order.status = "cancelled"
    order.updated_at = datetime.now(timezone.utc)

    notif = Notification(
        user_id=user.id,
        title="إلغاء طلب",
        message=f"تم إلغاء طلبك {order.order_number} واسترداد المبلغ",
        type="warning",
    )
    db.session.add(notif)
    db.session.commit()

    send_telegram_notification(user.telegram_id, f"تم إلغاء طلبك {order.order_number} واسترداد المبلغ")
    notify_admins(f"❌ طلب {order.order_number} أُلغي من قبل المستخدم")

    return jsonify({"message": "تم إلغاء الطلب واسترداد المبلغ"}), 200


# ============================================================
# ============ /api/orders/my — طلبات المستخدم ============
# ============================================================
@main.route("/api/orders/my", methods=["GET"])
def get_my_orders():
    telegram_id = request.args.get("telegram_id", type=int)
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify([])
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        product = Product.query.get(o.product_id)
        result.append({
            "id": o.id,
            "order_number": o.order_number,
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "quantity": o.quantity,
            "unit_price": o.unit_price,
            "total_price": o.total_price,
            "discount_amount": o.discount_amount or 0,
            "coupon_code": o.coupon_code,
            "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return jsonify(result)