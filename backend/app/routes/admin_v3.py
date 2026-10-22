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
    
    total_users = User.query.count()
    total_orders = Order.query.count()
    total_deposits = Deposit.query.filter_by(status='approved').count()
    
    # حساب الإيرادات من الطلبات المكتملة
    revenue = db.session.query(db.func.sum(Order.total_price)).filter(Order.status == 'completed').scalar() or 0.0
    
    return jsonify({
        "total_users": total_users,
        "total_orders": total_orders,
        "total_deposits": total_deposits,
        "revenue": float(revenue)
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
    new_product = Product(
        name=data.get("name"), category_id=data.get("category_id"), image=image_url,
        base_price=float(data.get("price", 0)), product_type=data.get("pricing_type", "fixed"),
        base_quantity=int(data.get("base_qty", 0)), input_type=data.get("input_type", "id")
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

# ================== 3. المستخدمين ==================
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
