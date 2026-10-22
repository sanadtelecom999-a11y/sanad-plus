from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from ..models.base import User, Product, Category, Deposit, FinancialAuditLog, Setting, Order
from ..extensions import db
from . import main
from .admin_utils import handle_errors, is_admin_user
from ..services.cloudinary_service import upload_base64_image
from app.services.admin_service import adjust_user_balance, AdminServiceError

# ================== 0. الإحصائيات ==================
@main.route("/admin/api/stats", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_stats():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    # جلب أرقام حقيقية
    total_users = User.query.count()
    total_orders = Order.query.count()
    pending_deposits = Deposit.query.filter_by(status='pending').count()
    
    return jsonify({
        "total_users": total_users,
        "total_orders": total_orders,
        "pending_deposits": pending_deposits
    })

# ================== 1. المنتجات ==================
@main.route("/admin/api/products", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_products_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    products = Product.query.all()
    result = [{
        "id": p.id, "name": p.name, "price": float(getattr(p, 'base_price', 0)),
        "category_id": p.category_id, "image": getattr(p, 'image', None),
        "stock": getattr(p, 'stock', 0), 
        "pricing_type": getattr(p, 'product_type', 'fixed'),
        "base_qty": getattr(p, 'base_quantity', 0),
        "base_price": float(getattr(p, 'base_price', 0))
    } for p in products]
    return jsonify({"products": result})

@main.route("/admin/api/products", methods=["POST"])
@jwt_required()
@handle_errors
def admin_create_product_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    
    image_url = data.get("image")
    if image_url and image_url.startswith("data:image/"):
        uploaded_url = upload_base64_image(image_url, folder="sanad/products")
        if uploaded_url: image_url = uploaded_url

    # تأكيد حفظ السعر
    price_val = float(data.get("price", 0))
    
    new_product = Product(
        name=data.get("name"),
        category_id=data.get("category_id"),
        image=image_url,
        base_price=price_val,
        product_type=data.get("pricing_type", "fixed"),
        base_quantity=int(data.get("base_qty", 0)),
        input_type=data.get("input_type", "id")
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"success": True, "id": new_product.id})

# ================== 2. الأقسام ==================
@main.route("/admin/api/categories", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_categories_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    categories = Category.query.all()
    result = [{"id": c.id, "name": c.name, "image": getattr(c, 'image_url', None)} for c in categories]
    return jsonify({"categories": result})

@main.route("/admin/api/categories", methods=["POST"])
@jwt_required()
@handle_errors
def admin_create_category_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    
    image_url = data.get("image")
    if image_url and image_url.startswith("data:image/"):
        uploaded_url = upload_base64_image(image_url, folder="sanad/categories")
        if uploaded_url: image_url = uploaded_url

    new_cat = Category(name=data.get("name"), image_url=image_url)
    db.session.add(new_cat)
    db.session.commit()
    return jsonify({"success": True, "id": new_cat.id})

# ================== 3. الإيداعات ==================
@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_deposits_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.filter_by(status='pending').order_by(Deposit.created_at.desc()).all()
    result = [{
        "id": d.id, "amount": float(d.amount), "method": d.method,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "proof_image": d.proof_image, "transaction_id": d.transaction_id, "sender_name": d.sender_name,
        "user": {"first_name": d.user.first_name} if d.user else {"first_name": "غير معروف"}
    } for d in deposits]
    return jsonify({"deposits": result})

@main.route("/admin/api/deposits/<int:id>/<action>", methods=["POST"])
@jwt_required()
@handle_errors
def admin_handle_deposit_v3(id, action):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(id)
    if not deposit: return jsonify({"error": "غير موجود"}), 404
    
    if action == 'approve':
        deposit.status = 'approved'
        if deposit.user:
            adjust_user_balance(deposit.user.id, deposit.amount, "إيداع مقبول", "deposit", deposit.id)
    elif action == 'reject':
        deposit.status = 'rejected'
        
    db.session.commit()
    return jsonify({"success": True})

# ================== 4. المستخدمين ==================
@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    users = User.query.all()
    result = [{
        "id": u.id, "first_name": u.first_name, "username": getattr(u, 'username', ''), 
        "telegram_id": u.telegram_id, "balance": float(u.balance),
        "kyc_status": getattr(u, 'kyc_status', 'unverified'), "vip_level": getattr(u, 'vip_level', 0)
    } for u in users]
    return jsonify({"users": result})

@main.route("/admin/api/users/<int:id>/balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_edit_balance_v3(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_balance = float(data.get("balance", 0))
    
    user = User.query.get(id)
    if not user: return jsonify({"error": "غير موجود"}), 404
    
    difference = new_balance - float(user.balance)
    try:
        adjust_user_balance(user.id, difference, "تعديل رصيد يدوي بواسطة الأدمن", "manual", user.id)
        db.session.commit()
        return jsonify({"success": True})
    except AdminServiceError as e:
        return jsonify({"error": str(e)}), 400

# ================== 5. التدقيق المالي والإعدادات ==================
@main.route("/admin/api/audit", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_audit_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    logs = FinancialAuditLog.query.order_by(FinancialAuditLog.id.desc()).limit(100).all()
    result = [{
        "id": l.id, "action": l.action, "amount": float(l.amount) if l.amount else 0,
        "before": float(l.balance_before) if l.balance_before else 0, 
        "after": float(l.balance_after) if l.balance_after else 0,
        "ip": getattr(l, 'ip_address', '127.0.0.1'),
        "date": l.created_at.isoformat() if l.created_at else datetime.now().isoformat()
    } for l in logs]
    return jsonify({"audit": result})

@main.route("/admin/api/settings", methods=["GET", "PUT"])
@jwt_required()
@handle_errors
def admin_settings_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    if request.method == "PUT":
        data = request.get_json() or {}
        for key, value in data.items():
            setting = Setting.query.filter_by(key=key).first()
            if setting: setting.value = str(value)
            else: db.session.add(Setting(key=key, value=str(value)))
        db.session.commit()
        return jsonify({"success": True})
    settings = Setting.query.all()
    return jsonify({s.key: s.value for s in settings})
