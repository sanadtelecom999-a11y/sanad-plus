from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from ..models.base import User, Product, Category, Deposit, FinancialAuditLog, Setting, Order, KYCRequest, ServiceRequest
from ..extensions import db
from . import main
from .admin_utils import handle_errors, is_admin_user
from ..services.cloudinary_service import upload_base64_image
from app.services.admin_service import adjust_user_balance, AdminServiceError

# 0. الإحصائيات
@main.route("/admin/api/stats", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_stats():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    total_users = User.query.count()
    total_orders = Order.query.count()
    total_deposits = Deposit.query.filter_by(status='approved').count()
    revenue = db.session.query(db.func.sum(Order.total_price)).filter(Order.status == 'completed').scalar() or 0.0
    return jsonify({"total_users": total_users, "total_orders": total_orders, "total_deposits": total_deposits, "revenue": float(revenue)})

# 1. المنتجات والأقسام (تعمل بالفعل)
@main.route("/admin/api/products", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_products_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    products = Product.query.all()
    return jsonify([{"id": p.id, "name": p.name, "price": float(getattr(p, 'base_price', 0)), "category_id": p.category_id, "image": getattr(p, 'image', None), "product_type": getattr(p, 'product_type', 'fixed')} for p in products])

@main.route("/admin/api/categories", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_categories_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    categories = Category.query.all()
    return jsonify([{"id": c.id, "name": c.name, "image": getattr(c, 'image_url', None)} for c in categories])

# 2. المستخدمين (تعمل بالفعل)
@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    users = User.query.all()
    return jsonify([{"id": u.id, "first_name": u.first_name, "username": getattr(u, 'username', ''), "telegram_id": u.telegram_id, "balance": float(u.balance), "kyc_status": getattr(u, 'kyc_status', 'unverified'), "vip_level": getattr(u, 'vip_level', 0)} for u in users])

@main.route("/admin/api/users/<int:id>/balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_edit_balance_v3(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_balance = float(data.get("balance", 0))
    user = User.query.get(id)
    if not user: return jsonify({"error": "غير موجود"}), 404
    try:
        adjust_user_balance(user.id, new_balance - float(user.balance), "تعديل رصيد يدوي", "manual", user.id)
        db.session.commit()
        return jsonify({"success": True})
    except AdminServiceError as e: return jsonify({"error": str(e)}), 400

# 3. الإرساليات (الموحدة)
@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_deposits_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.filter_by(status='pending').order_by(Deposit.created_at.desc()).all()
    return jsonify([{"id": d.id, "amount": float(d.amount), "method": d.method, "created_at": d.created_at.isoformat(), "user": {"first_name": d.user.first_name} if d.user else {}} for d in deposits])

@main.route("/admin/api/deposits/<int:id>/<action>", methods=["POST"])
@jwt_required()
@handle_errors
def admin_handle_deposit_v3(id, action):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(id)
    if not deposit: return jsonify({"error": "غير موجود"}), 404
    if action == 'approve':
        deposit.status = 'approved'
        if deposit.user: adjust_user_balance(deposit.user.id, deposit.amount, "إيداع مقبول", "deposit", deposit.id)
    elif action == 'reject': deposit.status = 'rejected'
    db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_orders_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    orders = Order.query.filter(Order.status.in_(['pending', 'review', 'processing'])).order_by(Order.created_at.desc()).all()
    return jsonify([{"id": o.id, "order_number": o.order_number, "product_name": o.product.name if o.product else "محذوف", "total_price": float(o.total_price), "status": o.status, "created_at": o.created_at.isoformat()} for o in orders])

@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_kyc_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    kycs = KYCRequest.query.filter_by(status='pending').order_by(KYCRequest.created_at.desc()).all()
    return jsonify([{"id": k.id, "full_name": k.full_name, "user_name": k.user.first_name if k.user else "", "created_at": k.created_at.isoformat()} for k in kycs])

# 4. التدقيق المالي
@main.route("/admin/api/audit", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_audit_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    logs = FinancialAuditLog.query.order_by(FinancialAuditLog.id.desc()).limit(50).all()
    return jsonify([{"id": l.id, "action": l.action, "amount": float(l.amount) if l.amount else 0, "before": float(l.balance_before) if l.balance_before else 0, "after": float(l.balance_after) if l.balance_after else 0, "date": l.created_at.isoformat()} for l in logs])
