from flask import request, jsonify
from ..models.base import User, Product, Category, Order, Deposit, KYCRequest, Setting, Notification, PaymentMethod
from ..extensions import db
from . import main
from datetime import datetime, timezone
import uuid
from ..services.cloudinary_service import upload_base64_image

@main.route("/api/miniapp/init", methods=["POST"])
def api_miniapp_init():
    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    
    if not telegram_id: return jsonify({"error": "Telegram ID required"}), 400
        
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(telegram_id=telegram_id, first_name=data.get("first_name", "مستخدم"), username=data.get("username", ""))
        db.session.add(user)
        db.session.commit()

    # فحص الحظر
    if getattr(user, 'is_banned', False):
        return jsonify({"banned": True, "message": "حسابك محظور، يرجى التواصل مع الدعم."})

    # فحص وضع الصيانة
    maint_mode = Setting.query.filter_by(key='maintenance_mode').first()
    if maint_mode and maint_mode.value == '1':
        return jsonify({"maintenance": True, "message": "المتجر تحت الصيانة حالياً، سنعود قريباً."})

    # جلب الإشعارات غير المقروءة
    notifications = Notification.query.filter_by(user_id=user.id, is_read=False).order_by(Notification.id.desc()).all()
    notifs_list = [{"id": n.id, "title": n.title, "message": n.message, "type": getattr(n, 'type', 'info')} for n in notifications]

    # جلب إعدادات المتجر
    settings = {s.key: s.value for s in Setting.query.all()}
    exchange_rate = float(settings.get('exchange_rate', 135))

    return jsonify({
        "user": {
            "id": user.id, "first_name": user.first_name, "username": user.username,
            "balance": float(user.balance), "kyc_status": getattr(user, 'kyc_status', 'unverified'),
            "discount": float(getattr(user, 'general_discount', 0)),
            "vip_level": getattr(user, 'vip_level', 0)
        },
        "notifications": notifs_list,
        "settings": {"exchange_rate": exchange_rate}
    })

@main.route("/api/miniapp/notifications/<int:id>/read", methods=["POST"])
def api_mark_notification_read(id):
    notif = Notification.query.get(id)
    if notif:
        notif.is_read = True
        db.session.commit()
    return jsonify({"success": True})

@main.route("/api/miniapp/products", methods=["GET"])
def api_get_products():
    categories = Category.query.all()
    result = []
    for cat in categories:
        products = Product.query.filter_by(category_id=cat.id).all()
        result.append({
            "id": cat.id, "name": cat.name, "image": getattr(cat, 'image_url', None),
            "products": [{
                "id": p.id, "name": p.name, "price": float(getattr(p, 'base_price', 0)),
                "image": getattr(p, 'image', None), "product_type": getattr(p, 'product_type', 'fixed'),
                "base_quantity": getattr(p, 'base_quantity', 0), "base_price": float(getattr(p, 'base_price', 0)),
                "input_type": getattr(p, 'input_type', 'id')
            } for p in products]
        })
    return jsonify({"categories": result})

@main.route("/api/miniapp/deposit", methods=["POST"])
def api_create_deposit():
    data = request.get_json() or {}
    user = User.query.filter_by(telegram_id=data.get("telegram_id")).first()
    if not user or getattr(user, 'is_banned', False): return jsonify({"error": "غير مصرح"}), 403
        
    image_url = None
    receipt_base64 = data.get("receipt_image")
    if receipt_base64 and receipt_base64.startswith("data:image/"):
        image_url = upload_base64_image(receipt_base64, folder="sanad/deposits")
        
    new_deposit = Deposit(
        user_id=user.id, amount=float(data.get("amount")), method=data.get("method"), 
        sender_name=data.get("sender_name"), proof_image=image_url, 
        transaction_id=f"DEP-{uuid.uuid4().hex[:8].upper()}", status="pending"
    )
    db.session.add(new_deposit)
    db.session.commit()
    return jsonify({"success": True, "message": "تم إرسال طلب الإيداع بنجاح"})

@main.route("/api/miniapp/order", methods=["POST"])
def api_create_order():
    data = request.get_json() or {}
    user = User.query.filter_by(telegram_id=data.get("telegram_id")).first()
    product = Product.query.get(data.get("product_id"))
    
    if not user or getattr(user, 'is_banned', False) or not product:
        return jsonify({"error": "بيانات غير صحيحة أو حساب محظور"}), 400
        
    qty = data.get("quantity", 1)
    original_price = float(getattr(product, 'base_price', 0))
    
    # حساب السعر الأساسي
    if getattr(product, 'product_type', 'fixed') == 'quantity' and product.base_quantity > 0:
        original_price = (float(getattr(product, 'base_price', 0)) / product.base_quantity) * qty

    # تطبيق الخصم (إن وجد)
    discount_pct = float(getattr(user, 'general_discount', 0))
    final_price = original_price - (original_price * (discount_pct / 100))
    final_price = round(final_price, 2)
        
    if user.balance < final_price: 
        return jsonify({"error": "رصيدك غير كافٍ"}), 400
        
    user.balance -= final_price
    new_order = Order(
        user_id=user.id, product_id=product.id, order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
        quantity=qty, unit_price=final_price / qty, total_price=final_price, 
        delivery_data=data.get("delivery_data"), status="pending"
    )
    db.session.add(new_order)
    db.session.commit()
    return jsonify({"success": True, "message": "تم إرسال الطلب بنجاح", "new_balance": float(user.balance)})

@main.route("/api/miniapp/kyc", methods=["POST"])
def api_submit_kyc():
    data = request.get_json() or {}
    user = User.query.filter_by(telegram_id=data.get("telegram_id")).first()
    if not user or getattr(user, 'is_banned', False): return jsonify({"error": "غير مصرح"}), 403
    if getattr(user, 'kyc_status', '') == 'verified': return jsonify({"error": "حسابك موثق بالفعل"}), 400
    
    front_img = upload_base64_image(data.get("id_front"), folder="sanad/kyc") if data.get("id_front") else None
    selfie_img = upload_base64_image(data.get("selfie"), folder="sanad/kyc") if data.get("selfie") else None
    
    new_kyc = KYCRequest(
        user_id=user.id, full_name=data.get("full_name"), phone=data.get("phone"),
        governorate=data.get("governorate"), region=data.get("region"),
        id_front_image=front_img, selfie_image=selfie_img, status="pending"
    )
    user.kyc_status = 'pending'
    db.session.add(new_kyc)
    db.session.commit()
    return jsonify({"success": True, "message": "تم إرسال طلب التوثيق بنجاح"})
