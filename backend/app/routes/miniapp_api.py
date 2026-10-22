from flask import request, jsonify
from ..models.base import User, Product, Category, Order, Deposit
from ..extensions import db
from . import main
from datetime import datetime, timezone
import uuid
from ..services.cloudinary_service import upload_base64_image

# 1. جلب بيانات المستخدم عند فتح التطبيق
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
        
    return jsonify({
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "username": user.username,
            "balance": float(user.balance),
            "kyc_status": getattr(user, 'kyc_status', 'unverified'),
            "vip_level": getattr(user, 'vip_level', 0)
        }
    })

# 2. جلب الأقسام والمنتجات الحقيقية
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

# 3. إرسال طلب إيداع حقيقي
@main.route("/api/miniapp/deposit", methods=["POST"])
def api_create_deposit():
    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    amount = data.get("amount")
    method = data.get("method")
    sender_name = data.get("sender_name")
    receipt_base64 = data.get("receipt_image")
    
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    image_url = None
    if receipt_base64 and receipt_base64.startswith("data:image/"):
        image_url = upload_base64_image(receipt_base64, folder="sanad/deposits")
        
    new_deposit = Deposit(
        user_id=user.id,
        amount=float(amount),
        method=method,
        sender_name=sender_name,
        proof_image=image_url,
        transaction_id=f"DEP-{uuid.uuid4().hex[:8].upper()}",
        status="pending"
    )
    db.session.add(new_deposit)
    db.session.commit()
    
    return jsonify({"success": True, "message": "تم إرسال طلب الإيداع بنجاح"})

# 4. إرسال طلب شراء منتج
@main.route("/api/miniapp/order", methods=["POST"])
def api_create_order():
    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)
    delivery_data = data.get("delivery_data")
    
    user = User.query.filter_by(telegram_id=telegram_id).first()
    product = Product.query.get(product_id)
    
    if not user or not product:
        return jsonify({"error": "بيانات غير صحيحة"}), 400
        
    total_price = product.price
    if getattr(product, 'product_type', 'fixed') == 'quantity' and product.base_quantity > 0:
        unit_price = product.base_price / product.base_quantity
        total_price = unit_price * quantity
        
    if user.balance < total_price:
        return jsonify({"error": "رصيدك غير كافٍ"}), 400
        
    user.balance -= total_price
    new_order = Order(
        user_id=user.id,
        product_id=product.id,
        order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
        quantity=quantity,
        unit_price=total_price / quantity,
        total_price=total_price,
        delivery_data=delivery_data,
        status="pending"
    )
    db.session.add(new_order)
    db.session.commit()
    
    return jsonify({"success": True, "message": "تم إرسال الطلب بنجاح", "new_balance": float(user.balance)})
