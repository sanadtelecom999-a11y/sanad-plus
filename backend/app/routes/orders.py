# ============================================================
# 📦 Orders Routes — v2.2 (Anti Race Condition)
# ============================================================
import uuid
import json
from datetime import datetime, timezone, timedelta
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Product, ProductBundle, Order, Transaction,
    Notification, Coupon, CouponUsage, Referral, Setting, log_financial
)
from ..extensions import db
from . import main
from ..services.telegram_service import (
    send_telegram_notification, notify_admins,
    send_referral_reward, send_order_refund_cancelled
)

REFERRAL_REWARD = 1.0


# ============================================================
# 🛡️ Helpers
# ============================================================
def fail(msg, code=None, status=400, **extra):
    """
    يرد بخطأ ويُحرر الأقفال (rollback).
    
    ⚠️ استخدم هذه الدالة بدل jsonify عند أي خطأ
       بعد استخدام get_current_user(lock=True)
    """
    db.session.rollback()
    payload = {"error": msg}
    if code:
        payload["code"] = code
    payload.update(extra)
    return jsonify(payload), status


def get_current_user(lock=False):
    """
    استخراج المستخدم من JWT.
    
    Args:
        lock: إذا True → يستخدم SELECT FOR UPDATE
              يقفل الصف حتى commit/rollback
              لمنع Race Conditions في العمليات المالية
    """
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    
    if lock:
        # 🔒 SELECT ... FOR UPDATE
        return User.query.filter_by(id=user_id).with_for_update().first()
    return User.query.get(user_id)


def get_syp_rate():
    try:
        setting = Setting.query.filter_by(key="syp_rate").first()
        if setting and setting.value:
            rate = float(setting.value)
            if rate > 0:
                return rate
    except (ValueError, TypeError):
        pass
    return 132.0


def apply_coupon_to_order(user, coupon_code, order_amount):
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
    if not user.referred_by_id:
        return
    order_count = Order.query.filter_by(user_id=user.id).count()
    if order_count != 1:
        return
    referrer = User.query.get(user.referred_by_id)
    if not referrer:
        return
    referral = Referral.query.filter_by(
        referrer_id=referrer.id,
        referred_user_id=user.id,
        status="pending"
    ).first()
    if not referral:
        return

    balance_before = referrer.balance
    referrer.balance = round(referrer.balance + REFERRAL_REWARD, 2)
    referrer.referral_earnings = round((referrer.referral_earnings or 0) + REFERRAL_REWARD, 2)
    referrer.referral_count = (referrer.referral_count or 0) + 1

    db.session.add(Transaction(
        user_id=referrer.id, type="referral_reward", amount=REFERRAL_REWARD,
        balance_after=referrer.balance, reference_type="referral", reference_id=referral.id,
    ))
    log_financial(
        user=referrer, action="referral_reward", amount=REFERRAL_REWARD,
        balance_before=balance_before, balance_after=referrer.balance,
        ref_type="referral", ref_id=referral.id,
    )

    referral.reward_amount = REFERRAL_REWARD
    referral.status = "completed"
    referral.completed_at = datetime.now(timezone.utc)

    db.session.add(Notification(
        user_id=referrer.id, title="مكافأة إحالة",
        message=f"حصلت على مكافأة {REFERRAL_REWARD:.2f}$", type="success",
    ))

    send_referral_reward(referrer, REFERRAL_REWARD)


# ============================================================
# 📦 Create Order — مع قفل المستخدم
# ============================================================
@main.route("/api/orders/", methods=["POST"])
@jwt_required()
def create_order():
    # 🔒 قفل صف المستخدم — يمنع الطلبات المتزامنة
    user = get_current_user(lock=True)
    if not user:
        return fail("غير مصرح", status=401)
    
    if user.is_banned:
        return fail("أنت محظور", code="USER_BANNED", status=403)

    data = request.get_json() or {}
    product = Product.query.get(data.get("product_id"))
    if not product or not product.is_active:
        return fail("منتج غير موجود", code="PRODUCT_INACTIVE", status=404)

    # Idempotency — إذا الطلب موجود مسبقاً
    key = data.get("idempotency_key")
    if key:
        existing = Order.query.filter_by(idempotency_key=key).first()
        if existing:
            # rollback لتحرير القفل ثم الرد ببيانات الطلب الموجود
            db.session.rollback()
            return jsonify({
                "order_id": existing.id,
                "order_number": existing.order_number,
                "status": existing.status,
                "total_price": existing.total_price,
                "message": "طلب مكرر",
            }), 200

    # ============================================================
    # 📝 بناء delivery_data
    # ============================================================
    delivery = {}
    if product.input_type == "id":
        v = str(data.get("player_id", "")).strip()
        if not v or not v.isdigit():
            return fail("أدخل ID اللاعب (أرقام فقط)")
        delivery = {"player_id": v}
    elif product.input_type == "account_id":
        v = str(data.get("account_id", "")).strip()
        if not v or not v.isdigit():
            return fail("أدخل ID الحساب (أرقام فقط)")
        delivery = {"account_id": v}
    elif product.input_type == "phone":
        v = str(data.get("phone", "")).strip()
        if not v or not v.isdigit():
            return fail("أدخل رقم الهاتف (أرقام فقط)")
        delivery = {"phone": v}

    # ============================================================
    # 💰 حساب السعر حسب نوع المنتج
    # ============================================================
    syp_amount = None

    if product.product_type == "topup":
        # رصيد سوري
        try:
            syp_amount = int(data.get("quantity", 0))
        except (ValueError, TypeError):
            return fail("مبلغ غير صالح")
        
        if syp_amount <= 0:
            return fail("مبلغ غير صالح")
        
        max_q = product.max_quantity or 0
        if max_q > 0 and syp_amount > max_q:
            return fail(f"الحد الأقصى {max_q:,} ل.س")
        
        rate = get_syp_rate()
        total_price = round(syp_amount / rate, 4)
        quantity = syp_amount
        unit_price = round(1 / rate, 6)
        delivery.update({"syp_amount": syp_amount, "syp_rate": rate, "usd_amount": total_price})

    elif product.product_type == "bundle":
        # باقة
        bundle = ProductBundle.query.get(data.get("bundle_id"))
        if not bundle or bundle.product_id != product.id:
            return fail("باقة غير صالحة")
        
        quantity = bundle.quantity
        unit_price = bundle.price_usd
        total_price = unit_price
        delivery.update({"bundle_id": bundle.id, "bundle_name": bundle.name})

    else:
        # كمية عادية
        try:
            quantity = int(data.get("quantity", 0))
        except (ValueError, TypeError):
            return fail("كمية غير صالحة")
        
        if quantity <= 0:
            return fail("كمية غير صالحة")
        
        max_q = product.max_quantity or 0
        if max_q > 0 and quantity > max_q:
            return fail(f"الحد الأقصى {max_q:,}")

        if product.stock is not None:
            if product.stock <= 0:
                return fail("نفذ المخزون", code="STOCK_OUT")
            if product.stock < quantity:
                return fail(f"المتوفر فقط {product.stock}", code="STOCK_INSUFFICIENT")

        unit_price = (product.base_price / product.base_quantity) if product.base_quantity > 0 else product.base_price
        total_price = round(unit_price * quantity, 4)

    # ============================================================
    # 🎟️ تطبيق الكوبون
    # ============================================================
    coupon_code = (data.get("coupon_code") or "").strip()
    discount = 0
    coupon_obj = None
    if coupon_code:
        discount, coupon_obj = apply_coupon_to_order(user, coupon_code, total_price)
        if coupon_obj:
            total_price = round(total_price - discount, 4)

    # ============================================================
    # 💳 فحص الرصيد (بعد القفل → آمن)
    # ============================================================
    balance_before = user.balance
    new_balance = round(balance_before - total_price, 2)

    if new_balance < 0:
        if not user.allow_negative_balance:
            return fail("رصيد غير كافٍ", code="NEGATIVE_NOT_ALLOWED")
        max_neg = user.max_negative_balance or 0
        if max_neg <= 0:
            return fail("رصيد غير كافٍ", code="NEGATIVE_LIMIT_ZERO")
        if abs(new_balance) > max_neg:
            return fail(
                f"وصلت للحد الأقصى (${max_neg:.2f})",
                code="NEGATIVE_LIMIT_EXCEEDED",
                max_negative=max_neg,
            )

    # ============================================================
    # ✅ تعديل الرصيد والمخزون
    # ============================================================
    user.balance = new_balance

    if product.stock is not None:
        product.stock = max(0, product.stock - (syp_amount if syp_amount else quantity))

    # ============================================================
    # 📦 إنشاء الطلب + Transactions
    # ============================================================
    order = Order(
        order_number="ORD-" + uuid.uuid4().hex[:8].upper(),
        user_id=user.id,
        product_id=product.id,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        discount_amount=discount,
        coupon_code=coupon_obj.code if coupon_obj else None,
        status="pending",
        delivery_data=json.dumps(delivery, ensure_ascii=False),
        idempotency_key=key or uuid.uuid4().hex,
        can_cancel_until=datetime.now(timezone.utc) + timedelta(seconds=120),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.session.add(order)

    db.session.add(Transaction(
        user_id=user.id,
        type="purchase",
        amount=-total_price,
        balance_after=user.balance,
        reference_type="order",
        reference_id=order.id,
    ))
    log_financial(
        user=user,
        action="order_created",
        amount=-total_price,
        balance_before=balance_before,
        balance_after=user.balance,
        ref_type="order",
        ref_id=order.id,
    )
    db.session.add(Notification(
        user_id=user.id,
        title="طلب جديد",
        message=f"طلبك {order.order_number} قيد المعالجة",
        type="info",
    ))

    # ⚠️ flush يدوي — لتوليد order.id قبل استخدامه في CouponUsage
    try:
        db.session.flush()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل الإنشاء: {e}"}), 500

    # ============================================================
    # 🎟️ تسجيل استخدام الكوبون — نفس transaction
    # ============================================================
    if coupon_obj:
        coupon_obj.used_count = (coupon_obj.used_count or 0) + 1
        db.session.add(CouponUsage(
            coupon_id=coupon_obj.id,
            user_id=user.id,
            order_id=order.id,
            discount_applied=discount,
            used_at=datetime.now(timezone.utc),
        ))

    # ============================================================
    # ✅ Commit واحد فقط (atomic)
    # ============================================================
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل الحفظ: {e}"}), 500

    # ============================================================
    # 🎁 Referral — بعد commit الطلب (له transactions مستقلة)
    # ============================================================
    try:
        complete_referral_if_first_order(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # لا نُفشل الطلب لو فشلت الإحالة
        print(f"referral error: {e}")

    # إشعار الأدمن
    notify_admins(f"طلب {order.order_number} - {product.name} - {total_price:.2f}$")

    # ============================================================
    # 📤 الرد
    # ============================================================
    resp = {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total_price": total_price,
        "discount_amount": discount,
        "new_balance": user.balance,
    }
    if syp_amount:
        resp["syp_amount"] = syp_amount
        resp["syp_rate"] = delivery["syp_rate"]
    return jsonify(resp), 201


# ============================================================
# ❌ Cancel Order — مع قفل المستخدم
# ============================================================
@main.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    # 🔒 قفل المستخدم
    user = get_current_user(lock=True)
    if not user:
        return fail("غير مصرح", status=401)
    
    order = Order.query.get(order_id)
    if not order or order.user_id != user.id:
        return fail("غير مصرح", status=403)
    
    if order.status != "pending":
        return fail("لا يمكن الإلغاء", code="ORDER_NOT_CANCELLABLE")

    created = order.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - created).total_seconds() > 120:
        return fail("انتهت مهلة الإلغاء", code="ORDER_TIME_EXPIRED")

    # ✅ استرجاع المخزون
    product = Product.query.get(order.product_id)
    if product and product.stock is not None:
        product.stock += order.quantity

    # ✅ استرجاع الرصيد
    balance_before = user.balance
    user.balance = round(user.balance + order.total_price, 2)

    db.session.add(Transaction(
        user_id=user.id,
        type="refund",
        amount=order.total_price,
        balance_after=user.balance,
        reference_type="order_cancel",
        reference_id=order.id,
    ))
    log_financial(
        user=user,
        action="order_cancelled",
        amount=order.total_price,
        balance_before=balance_before,
        balance_after=user.balance,
        ref_type="order",
        ref_id=order.id,
    )

    order.status = "cancelled"
    order.cancelled_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)

    db.session.add(Notification(
        user_id=user.id,
        title="إلغاء طلب",
        message=f"تم إلغاء طلبك {order.order_number} واسترداد المبلغ",
        type="warning",
    ))

    # ✅ commit واحد
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل الإلغاء: {e}"}), 500

    send_order_refund_cancelled(user, order.total_price, order.order_number)
    notify_admins(f"إلغاء طلب {order.order_number}")

    return jsonify({"message": "تم الإلغاء"})


# ============================================================
# 📋 Get My Orders
# ============================================================
@main.route("/api/orders/my", methods=["GET"])
@jwt_required()
def get_my_orders():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    
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
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
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