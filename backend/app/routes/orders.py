# ============================================================
# 📦 Orders Routes — v18.2
# ============================================================
# Endpoints:
#   GET  /api/orders/            → user's orders (list)
#   POST /api/orders/create      → create new order
#   POST /api/orders/<id>/cancel → cancel (120s window)
# ============================================================
# 🆕 v18.2:
#   - Decimal بدل float لكل الحسابات
#   - رفض الطلب إذا المخزون لا يكفي (لا max(0, ...))
#   - قفل صف الكوبون (لا تجاوز max_uses)
#   - قفل صف الطلب عند الإلغاء
#   - topup لا يُخصم من المخزون
# ============================================================
import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Product, ProductBundle, Order, Coupon, CouponUsage,
    Transaction, Notification, Referral,
    UserProductDiscount, log_financial,
)
from ..extensions import db
from . import main
from ..services.telegram_service import notify_admins


CANCEL_WINDOW_SECONDS = 120
REFERRAL_REWARD = Decimal('1.0000')


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════
def _d(v):
    """تحويل آمن إلى Decimal بـ 4 خانات عشرية"""
    if v is None:
        return Decimal('0.0000')
    if isinstance(v, Decimal):
        return v.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    return Decimal(str(v)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


def _f(v):
    """Decimal → float للـ JSON"""
    if v is None:
        return 0.0
    return float(v)


def _get_user():
    ident = get_jwt_identity()
    if not ident:
        return None
    try:
        return User.query.get(int(ident))
    except (ValueError, TypeError):
        return None


def _serialize_order(order, product=None):
    """تحويل Order إلى dict للـ JSON"""
    p = product or Product.query.get(order.product_id)

    delivery = None
    if order.delivery_data:
        try:
            delivery = order.delivery_data
        except Exception:
            delivery = None

    return {
        "id": order.id,
        "order_number": order.order_number,
        "product_id": order.product_id,
        "product_name": p.name if p else "منتج محذوف",
        "product_type": p.product_type if p else None,
        "product_unit_name": p.unit_name if p else "قطعة",
        "product_image": p.image if p else None,
        "quantity": order.quantity,
        "unit_price": _f(order.unit_price),
        "total_price": _f(order.total_price),
        "discount_amount": _f(order.discount_amount),
        "coupon_code": order.coupon_code,
        "status": order.status,
        "delivery_data": delivery,
        "can_cancel_until": order.can_cancel_until.isoformat() if order.can_cancel_until else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "failed_at": order.failed_at.isoformat() if order.failed_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


# ════════════════════════════════════════════════════════════
# GET /api/orders/ — list user orders
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/", methods=["GET"])
@main.route("/api/orders", methods=["GET"])
@jwt_required()
def list_orders():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    # pagination
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except (ValueError, TypeError):
        limit, offset = 50, 0

    orders = (
        Order.query
        .filter_by(user_id=user.id)
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    # نضمّ المنتجات في استعلام واحد (تجنب N+1)
    product_ids = [o.product_id for o in orders]
    products = {}
    if product_ids:
        prods = Product.query.filter(Product.id.in_(product_ids)).all()
        products = {p.id: p for p in prods}

    return jsonify([_serialize_order(o, products.get(o.product_id)) for o in orders])


# ════════════════════════════════════════════════════════════
# POST /api/orders/create
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/create", methods=["POST"])
@main.route("/api/orders", methods=["POST"])
@jwt_required()
def create_order():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.is_banned:
        return jsonify({"error": "حسابك موقوف", "code": "USER_BANNED"}), 403

    data = request.get_json() or {}
    product_id = data.get("product_id")
    idempotency_key = (data.get("idempotency_key") or "").strip()
    coupon_code = (data.get("coupon_code") or "").strip().upper() or None
    bundle_id = data.get("bundle_id")

    if not product_id:
        return jsonify({"error": "product_id مطلوب"}), 400
    if not idempotency_key:
        return jsonify({"error": "idempotency_key مطلوب"}), 400

    # ─── Idempotency (fast path) ───
    existing = Order.query.filter_by(idempotency_key=idempotency_key).first()
    if existing:
        return jsonify({
            "order_number": existing.order_number,
            "total_price": _f(existing.total_price),
            "status": existing.status,
            "idempotent": True,
        }), 200

    try:
        # ═════════════════════════════════════════════════════════
        # 🔒 بداية القسم الحرج — كل الأقفال داخل معاملة واحدة
        # ═════════════════════════════════════════════════════════

        # 1. اقفل المستخدم
        locked_user = User.query.filter_by(id=user.id).with_for_update().first()
        if not locked_user:
            return jsonify({"error": "مستخدم غير موجود"}), 404

        # 2. اقفل المنتج
        product = Product.query.filter_by(id=product_id).with_for_update().first()
        if not product or not product.is_active or product.deleted_at:
            return jsonify({"error": "المنتج غير متوفر", "code": "PRODUCT_NOT_FOUND"}), 404

        # ═══ 3. الكمية والسعر الأساسي (حسب النوع) ═══
        is_topup = (product.product_type == 'topup')
        is_bundle = (product.product_type == 'bundle')

        if is_bundle:
            if not bundle_id:
                return jsonify({"error": "bundle_id مطلوب"}), 400
            bundle = ProductBundle.query.filter_by(
                id=bundle_id, product_id=product.id, is_active=True
            ).first()
            if not bundle:
                return jsonify({"error": "الباقة غير متوفرة"}), 404
            quantity = 1
            unit_price = _d(bundle.price_usd)
            base_total = unit_price
            bundle_name = bundle.name
        else:
            try:
                quantity = int(data.get("quantity", 1))
            except (ValueError, TypeError):
                return jsonify({"error": "الكمية غير صحيحة"}), 400
            if quantity < 1:
                return jsonify({"error": "الكمية غير صحيحة"}), 400

            # حد أعلى للكمية
            max_q = product.max_quantity or 0
            if max_q > 0 and quantity > max_q:
                return jsonify({
                    "error": f"الحد الأقصى {max_q}",
                    "code": "MAX_QUANTITY_EXCEEDED",
                }), 400

            # السعر
            base_qty = product.base_quantity or 1
            base_price = _d(product.base_price)

            if is_topup:
                # topup: السعر لكل base_qty ل.س
                # مثال: base_quantity=1000، base_price=0.76$ → 5000 ل.س = 3.80$
                unit_price = (base_price / Decimal(base_qty)).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                )
                base_total = (base_price * Decimal(quantity) / Decimal(base_qty)).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                )
            else:
                unit_price = base_price
                base_total = (base_price * Decimal(quantity)).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                )
            bundle_name = None

        # ═══ 4. تحقق المخزون (رفض، لا max) ═══
        # topup لا يُخصم من المخزون (شحن رصيد = بلا مخزون)
        stock_to_check = quantity if not is_topup else 0
        if not is_topup and product.stock is not None:
            if product.stock < stock_to_check:
                return jsonify({
                    "error": f"الكمية المتوفرة {product.stock} فقط",
                    "code": "STOCK_INSUFFICIENT",
                    "available": product.stock,
                }), 400

        # ═══ 5. خصم المستخدم (منتج محدد → عام) ═══
        user_discount_pct = Decimal('0.0000')
        product_discount = UserProductDiscount.query.filter_by(
            user_id=locked_user.id, product_id=product.id
        ).first()
        if product_discount and _d(product_discount.discount_percent) > 0:
            user_discount_pct = _d(product_discount.discount_percent)
        elif locked_user.general_discount and _d(locked_user.general_discount) > 0:
            user_discount_pct = _d(locked_user.general_discount)

        if user_discount_pct > 0:
            after_user_discount = (
                base_total * (Decimal('1') - user_discount_pct / Decimal('100'))
            ).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        else:
            after_user_discount = base_total

        # ═══ 6. الكوبون (مع قفل الصف) ═══
        coupon_discount = Decimal('0.0000')
        coupon_obj = None

        if coupon_code:
            coupon_obj = Coupon.query.filter_by(code=coupon_code).with_for_update().first()

            if not coupon_obj:
                return jsonify({"error": "كود الخصم غير صحيح", "code": "COUPON_INVALID"}), 400
            if not coupon_obj.is_active or coupon_obj.deleted_at:
                return jsonify({"error": "الكود غير مفعّل", "code": "COUPON_INVALID"}), 400
            if coupon_obj.expires_at and coupon_obj.expires_at < datetime.now(timezone.utc):
                return jsonify({"error": "انتهت صلاحية الكود", "code": "COUPON_EXPIRED"}), 400
            if coupon_obj.max_uses > 0 and coupon_obj.used_count >= coupon_obj.max_uses:
                return jsonify({"error": "تم استهلاك الكود", "code": "COUPON_EXHAUSTED"}), 400
            if after_user_discount < _d(coupon_obj.min_amount):
                return jsonify({
                    "error": f"الحد الأدنى {_f(coupon_obj.min_amount)}$",
                    "code": "COUPON_MIN_AMOUNT",
                }), 400

            # استخدم الكود من قبل؟
            existing_usage = CouponUsage.query.filter_by(
                coupon_id=coupon_obj.id, user_id=locked_user.id
            ).first()
            if existing_usage:
                return jsonify({
                    "error": "استخدمت هذا الكود من قبل",
                    "code": "COUPON_ALREADY_USED",
                }), 400

            # حساب الخصم
            if coupon_obj.discount_type == 'percentage':
                coupon_discount = (
                    after_user_discount * (_d(coupon_obj.discount_value) / Decimal('100'))
                ).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                if coupon_obj.max_discount and _d(coupon_obj.max_discount) > 0:
                    cap = _d(coupon_obj.max_discount)
                    if coupon_discount > cap:
                        coupon_discount = cap
            else:  # fixed
                coupon_discount = _d(coupon_obj.discount_value)
                if coupon_discount > after_user_discount:
                    coupon_discount = after_user_discount

        # ═══ 7. المجموع النهائي ═══
        total = (after_user_discount - coupon_discount).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )
        if total < Decimal('0.0000'):
            total = Decimal('0.0000')

        # ═══ 8. تحقق الرصيد ═══
        current_balance = _d(locked_user.balance)

        if total > current_balance:
            if locked_user.allow_negative_balance:
                max_neg = _d(locked_user.max_negative_balance)
                new_balance = current_balance - total
                if new_balance < -max_neg:
                    return jsonify({
                        "error": "الرصيد السالب ممتلئ",
                        "code": "NEGATIVE_LIMIT_EXCEEDED",
                        "current": _f(current_balance),
                        "limit": _f(max_neg),
                    }), 400
            else:
                return jsonify({
                    "error": "رصيدك غير كافٍ",
                    "code": "INSUFFICIENT_BALANCE",
                    "balance": _f(current_balance),
                    "required": _f(total),
                }), 400

        # ═══ 9. بناء delivery_data من المدخلات ═══
        delivery = {}
        input_type = product.input_type or 'none'

        if input_type == 'id':
            pid = (data.get("player_id") or "").strip()
            if not pid or not pid.isdigit():
                return jsonify({"error": "ايدي اللاعب مطلوب (أرقام فقط)"}), 400
            if len(pid) > 20:
                return jsonify({"error": "ايدي اللاعب طويل جداً"}), 400
            delivery['player_id'] = pid

        elif input_type == 'account_id':
            aid = (data.get("account_id") or "").strip()
            if not aid or not aid.isdigit():
                return jsonify({"error": "ايدي الحساب مطلوب (أرقام فقط)"}), 400
            if len(aid) > 30:
                return jsonify({"error": "ايدي الحساب طويل جداً"}), 400
            delivery['account_id'] = aid

        elif input_type == 'phone':
            phone = (data.get("phone") or "").strip()
            if not phone or not phone.isdigit():
                return jsonify({"error": "رقم الهاتف مطلوب (أرقام فقط)"}), 400
            if not (8 <= len(phone) <= 15):
                return jsonify({"error": "رقم الهاتف غير صحيح"}), 400
            delivery['phone'] = phone

        elif input_type == 'url':
            url = (data.get("url") or "").strip()
            if not url:
                return jsonify({"error": "الرابط مطلوب"}), 400
            if not url.lower().startswith(('http://', 'https://')):
                return jsonify({"error": "الرابط يجب أن يبدأ بـ http:// أو https://"}), 400
            if len(url) > 1000:
                return jsonify({"error": "الرابط طويل جداً"}), 400
            delivery['url'] = url

        # إضافات خاصة
        if is_bundle:
            delivery['bundle_name'] = bundle_name
            delivery['bundle_quantity'] = bundle.quantity

        if is_topup:
            delivery['syp_amount'] = quantity

        # ═══ 10. إنشاء الطلب ═══
        order = Order(
            order_number='ORD-' + uuid.uuid4().hex[:8].upper(),
            user_id=locked_user.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total,
            discount_amount=(base_total - total).quantize(
                Decimal('0.0001'), rounding=ROUND_HALF_UP
            ),
            coupon_code=coupon_code,
            status='pending',
            delivery_data=json.dumps(delivery, ensure_ascii=False),
            idempotency_key=idempotency_key,
            can_cancel_until=datetime.now(timezone.utc) + timedelta(seconds=CANCEL_WINDOW_SECONDS),
        )
        db.session.add(order)
        db.session.flush()  # order.id

        # ═══ 11. خصم الرصيد ═══
        balance_before = current_balance
        locked_user.balance = (current_balance - total).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )

        # ═══ 12. سجل الحركة ═══
        db.session.add(Transaction(
            user_id=locked_user.id,
            type='purchase',
            amount=total,
            balance_after=locked_user.balance,
            reference_type='order',
            reference_id=order.id,
        ))

        log_financial(
            user=locked_user,
            action='order_created',
            amount=total,
            balance_before=balance_before,
            balance_after=locked_user.balance,
            ref_type='order',
            ref_id=order.id,
        )

        # ═══ 13. خصم المخزون (بلا max) ═══
        # topup: لا يُخصم
        if not is_topup and product.stock is not None:
            product.stock = product.stock - quantity

        # ═══ 14. تسجيل الكوبون ═══
        if coupon_obj:
            coupon_obj.used_count = (coupon_obj.used_count or 0) + 1
            db.session.add(CouponUsage(
                coupon_id=coupon_obj.id,
                user_id=locked_user.id,
                order_id=order.id,
                discount_applied=coupon_discount,
            ))

        # ═══ 15. مكافأة الإحالة (عند أول طلب) ═══
        _process_referral_inline(locked_user, order)

        # ═══ 16. إشعار ═══
        db.session.add(Notification(
            user_id=locked_user.id,
            title='تم إنشاء طلبك',
            message=f'طلبك {order.order_number} بقيمة {_f(total)}$ قيد المعالجة',
            type='info',
        ))

        db.session.commit()
        # ═════════════════════════════════════════════════════════
        # 🔓 نهاية القسم الحرج
        # ═════════════════════════════════════════════════════════

        # إشعار الأدمن (خارج المعاملة)
        try:
            notify_admins(
                f'🛍️ طلب جديد: {order.order_number} — {_f(total)}$\n'
                f'من: {locked_user.telegram_id}'
            )
        except Exception:
            pass

        return jsonify({
            'order_number': order.order_number,
            'total_price': _f(total),
            'status': order.status,
            'balance_after': _f(locked_user.balance),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ create_order error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'فشل إنشاء الطلب', 'code': 'INTERNAL_ERROR'}), 500


# ════════════════════════════════════════════════════════════
# Helper: Referral (inline, داخل المعاملة)
# ════════════════════════════════════════════════════════════
def _process_referral_inline(user, order):
    """
    إذا كان المستخدم مُحالاً (referred_by_id موجود)،
    وليس لديه referral مكتمل بعد → امنح المُحيل المكافأة.
    """
    if not user.referred_by_id:
        return

    # هل سبق أن أكملنا إحالة هذا المستخدم؟
    existing = Referral.query.filter_by(
        referred_user_id=user.id, status='completed'
    ).first()
    if existing:
        return

    # امنح المُحيل المكافأة
    referrer = User.query.filter_by(id=user.referred_by_id).with_for_update().first()
    if not referrer:
        return

    reward = REFERRAL_REWARD

    # أنشئ سجل الإحالة أو حدّثه
    referral = Referral.query.filter_by(
        referrer_id=referrer.id, referred_user_id=user.id
    ).first()

    if not referral:
        referral = Referral(
            referrer_id=referrer.id,
            referred_user_id=user.id,
            reward_amount=reward,
            status='completed',
            completed_at=datetime.now(timezone.utc),
        )
        db.session.add(referral)
    else:
        if referral.status == 'completed':
            return
        referral.reward_amount = reward
        referral.status = 'completed'
        referral.completed_at = datetime.now(timezone.utc)

    # رصيد المُحيل
    balance_before = _d(referrer.balance)
    referrer.balance = (balance_before + reward).quantize(
        Decimal('0.0001'), rounding=ROUND_HALF_UP
    )
    referrer.referral_earnings = (_d(referrer.referral_earnings) + reward).quantize(
        Decimal('0.0001'), rounding=ROUND_HALF_UP
    )
    referrer.referral_count = (referrer.referral_count or 0) + 1

    # سجل الحركة
    db.session.add(Transaction(
        user_id=referrer.id,
        type='referral_reward',
        amount=reward,
        balance_after=referrer.balance,
        reference_type='referral',
        reference_id=referral.id if referral.id else 0,
    ))

    log_financial(
        user=referrer,
        action='referral_reward',
        amount=reward,
        balance_before=balance_before,
        balance_after=referrer.balance,
        ref_type='referral',
        ref_id=None,
        note=f'مكافأة إحالة للطلب {order.order_number}',
    )

    db.session.add(Notification(
        user_id=referrer.id,
        title='مكافأة إحالة',
        message=f'حصلت على {_f(reward)}$ بسبب طلب صديقك',
        type='success',
    ))


# ════════════════════════════════════════════════════════════
# POST /api/orders/<id>/cancel
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    try:
        # ═════════════════════════════════════════════════════════
        # 🔒 بداية القسم الحرج
        # ═════════════════════════════════════════════════════════

        # 1. اقفل الطلب أولاً
        order = Order.query.filter_by(id=order_id).with_for_update().first()

        if not order:
            return jsonify({"error": "الطلب غير موجود"}), 404
        if order.user_id != user.id:
            return jsonify({"error": "غير مصرح"}), 403
        if order.status != 'pending':
            return jsonify({
                "error": "لا يمكن الإلغاء في هذه الحالة",
                "code": "ORDER_NOT_CANCELLABLE",
                "status": order.status,
            }), 400
        if not order.can_cancel_until or order.can_cancel_until < datetime.now(timezone.utc):
            return jsonify({
                "error": "انتهى وقت الإلغاء",
                "code": "ORDER_TIME_EXPIRED",
            }), 400

        # 2. اقفل المستخدم
        locked_user = User.query.filter_by(id=user.id).with_for_update().first()

        # 3. اقفل المنتج (لاسترداد المخزون)
        product = Product.query.filter_by(id=order.product_id).with_for_update().first()

        # 4. استرداد الرصيد
        refund = _d(order.total_price)
        balance_before = _d(locked_user.balance)
        locked_user.balance = (balance_before + refund).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )

        # 5. تحديث حالة الطلب
        order.status = 'cancelled'
        order.cancelled_at = datetime.now(timezone.utc)

        # 6. سجل الحركة
        db.session.add(Transaction(
            user_id=locked_user.id,
            type='refund',
            amount=refund,
            balance_after=locked_user.balance,
            reference_type='order_cancel',
            reference_id=order.id,
        ))

        log_financial(
            user=locked_user,
            action='order_cancelled',
            amount=refund,
            balance_before=balance_before,
            balance_after=locked_user.balance,
            ref_type='order',
            ref_id=order.id,
        )

        # 7. استرداد المخزون (إن كان للمنتج مخزون وكان ليس topup)
        is_topup = (product and product.product_type == 'topup')
        if product and product.stock is not None and not is_topup:
            product.stock = product.stock + order.quantity

        # 8. إشعار
        db.session.add(Notification(
            user_id=locked_user.id,
            title='تم إلغاء الطلب',
            message=f'تم استرداد {_f(refund)}$ لطلبك {order.order_number}',
            type='success',
        ))

        db.session.commit()
        # ═════════════════════════════════════════════════════════
        # 🔓 نهاية القسم الحرج
        # ═════════════════════════════════════════════════════════

        try:
            notify_admins(f'❌ إلغاء طلب: {order.order_number} — {_f(refund)}$')
        except Exception:
            pass

        return jsonify({
            "status": "cancelled",
            "refund": _f(refund),
            "balance": _f(locked_user.balance),
        })

    except Exception as e:
        db.session.rollback()
        print(f"❌ cancel_order error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "فشل الإلغاء", "code": "INTERNAL_ERROR"}), 500