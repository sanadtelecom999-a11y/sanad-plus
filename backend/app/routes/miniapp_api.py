from flask import request, jsonify
from ..models.base import User, Product, Category, Order, Deposit, KYCRequest
from ..extensions import db
from . import main
from datetime import datetime, timezone
import uuid
from ..services.cloudinary_service import upload_base64_image

@main.route("/api/miniapp/init", methods=["POST"])
def api_miniapp_init():
    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    
    if not telegram_id:
        return jsonify({"error": "Telegram ID required"}), 400
        
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id, 
            first_name=data.get("first_name", "مستخدم"),
            username=data.get("username", "")
        )
        db.session.add(user)
        db.session.commit()

    # جلب الاسم الثلاثي في حال كان موثقاً
    kyc_name = None
    if getattr(user, 'kyc_status', '') == 'verified':
        kyc_req = KYCRequest.query.filter_by(user_id=user.id, status='approved').first()
        if kyc_req:
            kyc_name = kyc_req.full_name

    # جلب الطلبات السابقة
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).limit(10).all()
    orders_list = []
    for o in orders:
        prod = Product.query.get(o.product_id)
        orders_list.append({
            "id": o.id, "order_number": o.order_number, "product_name": prod.name if prod else "منتج محذوف",
            "total_price": float(o.total_price), "status": o.status, "created_at": o.created_at.isoformat()
        })

    # جلب الإيداعات السابقة
    deposits = Deposit.query.filter_by(user_id=user.id).order_by(Deposit.created_at.desc()).limit(10).all()
    deposits_list = [{
        "id": d.id, "transaction_id": d.transaction_id, "amount": float(d.amount),
        "method": d.method, "status": d.status, "created_at": d.created_at.isoformat()
    } for d in deposits]
        
    return jsonify({
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "username": user.username,
            "balance": float(user.balance),
            "kyc_status": getattr(user, 'kyc_status', 'unverified'),
            "kyc_name": kyc_name,
            "vip_level": getattr(user, 'vip_level', 0)
        },
        "orders": orders_list,
        "deposits": deposits_list
    })

@main.route("/api/miniapp/products", methods=["GET"])
def api_get_products():
    categories = Category.query.all()
    result = []
    for cat in categories:
        products = Product.query.filter_by(category_id=cat.id).all()
        result.append({
            "id": cat.id,
            "name": cat.name,
            "image": getattr(cat, 'image_url', None),
            "products": [{
                "id": p.id,
                "name": p.name,
                "price": float(p.price),
                "image": getattr(p, 'image', None),
                "product_type": getattr(p, 'product_type', 'fixed'),
                "base_quantity": getattr(p, 'base_quantity', 0),
                "base_price": float(getattr(p, 'base_price', 0) or 0),
                "input_type": getattr(p, 'input_type', 'id')
            } for p in products]
        })
    return jsonify({"categories": result})

@main.route("/api/miniapp/deposit", methods=["POST"])
def api_create_deposit():
    data = request.get_json() or {}
    user = User.query.filter_by(telegram_id=data.get("telegram_id")).first()
    if not user: return jsonify({"error": "User not found"}), 404
        
    image_url = None
    receipt_base64 = data.get("receipt_image")
    if receipt_base64 and receipt_base64.startswith("data:image/"):
        image_url = upload_base64_image(receipt_base64, folder="sanad/deposits")
        
    new_deposit = Deposit(
        user_id=user.id, amount=float(data.get("amount")),
        method=data.get("method"), sender_name=data.get("sender_name"),
        proof_image=image_url, transaction_id=f"DEP-{uuid.uuid4().hex[:8].upper()}",
        status="pending"
    )
    db.session.add(new_deposit)
    db.session.commit()
    return jsonify({"success": True, "message": "تم إرسال طلب الإيداع بنجاح"})

@main.route("/api/miniapp/order", methods=["POST"])
def api_create_order():
    data = request.get_json() or {}
    user = User.query.filter_by(telegram_id=data.get("telegram_id")).first()
    product = Product.query.get(data.get("product_id"))
    
    if not user or not product: return jsonify({"error": "بيانات غير صحيحة"}), 400
        
    total_price = product.price
    if getattr(product, 'product_type', 'fixed') == 'quantity' and product.base_quantity > 0:
        total_price = (product.base_price / product.base_quantity) * data.get("quantity", 1)
        
    if user.balance < total_price: return jsonify({"error": "رصيدك غير كافٍ"}), 400
        
    user.balance -= total_price
    new_order = Order(
        user_id=user.id, product_id=product.id, order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
        quantity=data.get("quantity", 1), unit_price=total_price / data.get("quantity", 1),
        total_price=total_price, delivery_data=data.get("delivery_data"), status="pending"
    )
    db.session.add(new_order)
    db.session.commit()
    return jsonify({"success": True, "message": "تم إرسال الطلب بنجاح", "new_balance": float(user.balance)})
