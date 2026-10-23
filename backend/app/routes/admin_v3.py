from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from ..models.base import User, Product, Category, Deposit, FinancialAuditLog, Setting, Order, KYCRequest, ServiceRequest, PaymentMethod
from ..extensions import db
from . import main
from .admin_utils import handle_errors, is_admin_user
from ..services.cloudinary_service import upload_base64_image
from app.services.admin_service import adjust_user_balance, AdminServiceError
import requests
import os

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

# 1. الشارات (Badges Counts)
@main.route("/admin/api/inbox/counts", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_inbox_counts():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    return jsonify({
        "deposits": Deposit.query.filter_by(status='pending').count(),
        "orders": Order.query.filter(Order.status.in_(['pending', 'review', 'processing'])).count(),
        "kyc": KYCRequest.query.filter_by(status='pending').count(),
        "services": ServiceRequest.query.filter_by(status='pending').count() if hasattr(ServiceRequest, 'status') else 0
    })

# 2. المنتجات والأقسام
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

# 3. المستخدمين
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

# 4. الإرساليات
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

@main.route("/admin/api/services", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_services_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    # Placeholder for ServiceRequest if exists
    return jsonify([])

# 5. التدقيق المالي
@main.route("/admin/api/audit", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_audit_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    logs = FinancialAuditLog.query.order_by(FinancialAuditLog.id.desc()).limit(50).all()
    return jsonify([{"id": l.id, "action": l.action, "amount": float(l.amount) if l.amount else 0, "before": float(l.balance_before) if l.balance_before else 0, "after": float(l.balance_after) if l.balance_after else 0, "date": l.created_at.isoformat()} for l in logs])

# 6. الأرشيف (الجديد)
@main.route("/admin/api/archive", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_archive_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    # جلب الطلبات المنتهية
    orders = Order.query.filter(Order.status.in_(['completed', 'failed', 'rejected', 'cancelled'])).order_by(Order.created_at.desc()).limit(50).all()
    orders_data = [{"type": "order", "id": o.id, "ref": o.order_number, "user": o.user.first_name if o.user else "", "amount": float(o.total_price), "status": o.status, "date": o.created_at.isoformat()} for o in orders]
    
    # جلب الإيداعات المنتهية
    deposits = Deposit.query.filter(Deposit.status.in_(['approved', 'rejected'])).order_by(Deposit.created_at.desc()).limit(50).all()
    deposits_data = [{"type": "deposit", "id": d.id, "ref": d.transaction_id, "user": d.user.first_name if d.user else "", "amount": float(d.amount), "status": d.status, "date": d.created_at.isoformat()} for d in deposits]
    
    # دمجهم وترتيبهم حسب التاريخ
    combined = sorted(orders_data + deposits_data, key=lambda x: x['date'], reverse=True)
    return jsonify(combined)

# 7. طرق الدفع (الجديد)
@main.route("/admin/api/payments", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_payments_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    
    if request.method == "POST":
        data = request.get_json()
        new_pay = PaymentMethod(
            name=data.get("name"), min_amount=float(data.get("min_amount", 0)),
            max_amount=float(data.get("max_amount", 0)), account_number=data.get("account_number"),
            is_active=True
        )
        db.session.add(new_pay)
        db.session.commit()
        return jsonify({"success": True})

    payments = PaymentMethod.query.all()
    return jsonify([{"id": p.id, "name": p.name, "min": float(p.min_amount), "max": float(p.max_amount), "account": p.account_number, "active": p.is_active} for p in payments])

@main.route("/admin/api/payments/<int:id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_payment_v3(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    p = PaymentMethod.query.get(id)
    if p: db.session.delete(p); db.session.commit()
    return jsonify({"success": True})

# 8. الإعدادات (الجديد)
@main.route("/admin/api/settings", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_settings_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    
    if request.method == "POST":
        data = request.get_json()
        for key, value in data.items():
            setting = Setting.query.filter_by(key=key).first()
            if setting: setting.value = str(value)
            else: db.session.add(Setting(key=key, value=str(value)))
        db.session.commit()
        return jsonify({"success": True})

    settings = Setting.query.all()
    return jsonify({s.key: s.value for s in settings})

# 9. إرسال الإشعارات (الجديد)
@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
@handle_errors
def admin_send_notification_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    message = data.get("message")
    target = data.get("target") # 'all' or specific telegram_id
    
    if not message: return jsonify({"error": "الرسالة فارغة"}), 400

    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token: return jsonify({"error": "Bot Token missing"}), 500

    # إذا كان الإرسال للجميع
    if target == 'all':
        users = User.query.all()
        # في الواقع، يجب استخدام Queue لتجنب البطء، لكننا سنرسل بشكل متوازي هنا للتبسيط
        success_count = 0
        for u in users:
            try:
                requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", 
                              json={"chat_id": u.telegram_id, "text": message, "parse_mode": "HTML"}, timeout=3)
                success_count += 1
            except: pass
        return jsonify({"success": True, "count": success_count})
    else:
        # إرسال لمستخدم واحد
        try:
            requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", 
                          json={"chat_id": target, "text": message, "parse_mode": "HTML"}, timeout=3)
            return jsonify({"success": True, "count": 1})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
