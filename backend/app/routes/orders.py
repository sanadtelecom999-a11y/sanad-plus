import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User, Product, ProductBundle, Order, Transaction, Notification
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification

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

    # تحديد السعر والكمية حسب نوع المنتج
    if product.product_type == "bundle":
        bundle_id = data.get("bundle_id")
        bundle = ProductBundle.query.get(bundle_id)
        if not bundle or bundle.product_id != product.id:
            return jsonify({"error": "باقة غير صالحة"}), 400
        quantity = bundle.quantity
        unit_price = bundle.price_usd
        total_price = unit_price
        delivery_data = {"bundle_id": bundle.id, "bundle_name": bundle.name}
    else:
        quantity = int(data.get("quantity", 0))
        if quantity <= 0:
            return jsonify({"error": "الكمية غير صالحة"}), 400

        # حساب سعر الوحدة الصحيح
        if product.base_quantity > 0:
            unit_price = product.base_price / product.base_quantity
        else:
            unit_price = product.base_price

        total_price = round(unit_price * quantity, 4)  # دقة 4 أرقام
        delivery_data = {}

    # الحقول المخصصة
    if product.input_type == "id":
        delivery_data["player_id"] = data.get("player_id", "")
    elif product.input_type == "phone":
        delivery_data["phone"] = data.get("phone", "")

    if user.balance < total_price:
        return jsonify({"error": "رصيد غير كافٍ"}), 400

    order = Order(
        order_number="ORD-" + uuid.uuid4().hex[:8].upper(),
        user_id=user.id,
        product_id=product.id,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        status="pending",
        delivery_data=str(delivery_data),
        idempotency_key=data.get("idempotency_key", uuid.uuid4().hex),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.session.add(order)

    # خصم الرصيد
    user.balance -= total_price

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

    send_telegram_notification(user.telegram_id, f"طلبك {order.order_number} قيد المعالجة")

    return jsonify({
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total_price": total_price,
        "message": "طلبك قيد المعالجة",
    }), 201

@main.route("/api/orders/my", methods=["GET"])
def get_my_orders():
    telegram_id = request.args.get("telegram_id", type=int)
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify([])
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    return jsonify([{
        "id": o.id,
        "order_number": o.order_number,
        "product_id": o.product_id,
        "quantity": o.quantity,
        "unit_price": o.unit_price,
        "total_price": o.total_price,
        "status": o.status,
        "delivery_data": o.delivery_data,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    } for o in orders])
