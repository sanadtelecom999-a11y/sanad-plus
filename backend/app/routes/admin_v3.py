from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from ..models.base import User, Product, Category, Deposit, FinancialAuditLog, Setting, Order, KYCRequest, ServiceRequest, PaymentMethod, Notification
from ..extensions import db
from . import main
from .admin_utils import handle_errors, is_admin_user
from ..services.cloudinary_service import upload_base64_image
from app.services.admin_service import adjust_user_balance, AdminServiceError
import requests, os

# 0. الإحصائيات
@main.route("/admin/api/stats", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_stats():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    return jsonify({
        "total_users": User.query.count(),
        "total_orders": Order.query.count(),
        "total_deposits": Deposit.query.filter_by(status='approved').count(),
        "revenue": float(db.session.query(db.func.sum(Order.total_price)).filter(Order.status == 'completed').scalar() or 0.0)
    })

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
        "services": ServiceRequest.query.filter_by(status='pending').count() if hasattr(ServiceRequest, 'status') else ServiceRequest.query.count()
    })

# 2. المنتجات والأقسام
@main.route("/admin/api/products", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_products_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    products = Product.query.all()
    return jsonify([{"id": p.id, "name": p.name, "price": float(getattr(p, 'base_price', 0)), "category_id": p.category_id, "image": getattr(p, 'image', None), "product_type": getattr(p, 'product_type', 'fixed'), "stock": getattr(p, 'stock', 0)} for p in products])

@main.route("/admin/api/products/<int:id>", methods=["PUT"])
@jwt_required()
@handle_errors
def admin_update_product(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(id)
    if not product: return jsonify({"error": "غير موجود"}), 404
    
    data = request.get_json()
    product.name = data.get("name", product.name)
    product.base_price = float(data.get("price", product.base_price))
    product.category_id = data.get("category_id", product.category_id)
    
    if data.get("image") and data.get("image").startswith("data:image/"):
        url = upload_base64_image(data.get("image"), folder="sanad/products")
        if url: product.image = url
        
    db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/categories", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_categories_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    return jsonify([{"id": c.id, "name": c.name, "image": getattr(c, 'image_url', None)} for c in Category.query.all()])

# 3. المستخدمين (تعديل وإحصائيات)
@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    users = User.query.all()
    return jsonify([{
        "id": u.id, "first_name": u.first_name, "username": getattr(u, 'username', ''), 
        "telegram_id": u.telegram_id, "balance": float(u.balance), 
        "kyc_status": getattr(u, 'kyc_status', 'unverified'), "vip_level": getattr(u, 'vip_level', 0),
        "is_banned": getattr(u, 'is_banned', False), "discount": float(getattr(u, 'general_discount', 0))
    } for u in users])

@main.route("/admin/api/users/<int:id>/stats", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_user_stats(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(id)
    if not user: return jsonify({"error": "غير موجود"}), 404
    
    total_orders = Order.query.filter_by(user_id=id).count()
    total_deposits = Deposit.query.filter_by(user_id=id, status='approved').count()
    total_spent = db.session.query(db.func.sum(Order.total_price)).filter(Order.user_id == id, Order.status == 'completed').scalar() or 0.0
    
    # جلب اسم KYC إن وجد
    kyc_name = None
    kyc_req = KYCRequest.query.filter_by(user_id=id, status='approved').first()
    if kyc_req: kyc_name = kyc_req.full_name

    return jsonify({
        "telegram_id": user.telegram_id,
        "sanad_id": f"SN-{user.id:06d}",
        "kyc_name": kyc_name,
        "kyc_status": getattr(user, 'kyc_status', 'unverified'),
        "total_orders": total_orders,
        "total_deposits": total_deposits,
        "total_spent": float(total_spent),
        "discount": float(getattr(user, 'general_discount', 0)),
        "is_banned": getattr(user, 'is_banned', False)
    })

@main.route("/admin/api/users/<int:id>/edit", methods=["POST"])
@jwt_required()
@handle_errors
def admin_edit_user(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(id)
    if not user: return jsonify({"error": "غير موجود"}), 404
    
    data = request.get_json()
    
    # 1. تعديل الرصيد (إذا تم إرساله)
    if "balance" in data:
        new_balance = float(data["balance"])
        difference = new_balance - float(user.balance)
        if difference != 0:
            adjust_user_balance(user.id, difference, "تعديل رصيد بواسطة الأدمن", "admin", user.id)
    
    # 2. الحظر
    if "is_banned" in data:
        user.is_banned = bool(data["is_banned"])
        
    # 3. الخصم (نسبة مئوية)
    if "discount" in data:
        user.general_discount = float(data["discount"])
        
    db.session.commit()
    return jsonify({"success": True})

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
    
    data = request.get_json() or {}
    note = data.get("note", "") # ملاحظة الأدمن
    
    if action == 'approve':
        deposit.status = 'approved'
        if deposit.user: adjust_user_balance(deposit.user.id, deposit.amount, "إيداع مقبول", "deposit", deposit.id)
    elif action == 'reject': 
        deposit.status = 'rejected'
    
    if hasattr(deposit, 'admin_note'): deposit.admin_note = note
    db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_orders_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    orders = Order.query.filter(Order.status.in_(['pending', 'review', 'processing'])).order_by(Order.created_at.desc()).all()
    return jsonify([{"id": o.id, "order_number": o.order_number, "product_name": o.product.name if o.product else "محذوف", "total_price": float(o.total_price), "status": o.status, "delivery_data": o.delivery_data, "created_at": o.created_at.isoformat()} for o in orders])

@main.route("/admin/api/orders/<int:id>/<action>", methods=["POST"])
@jwt_required()
@handle_errors
def admin_handle_order_v3(id, action):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(id)
    if not order: return jsonify({"error": "غير موجود"}), 404
    
    data = request.get_json() or {}
    note = data.get("note", "")
    
    if action == 'approve': order.status = 'completed'
    elif action == 'reject': 
        order.status = 'failed'
        # إرجاع المبلغ للمستخدم عند الرفض
        if order.user: adjust_user_balance(order.user.id, order.total_price, "استرجاع مبلغ طلب مرفوض", "refund", order.id)
        
    if hasattr(order, 'admin_note'): order.admin_note = note
    db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_kyc_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    kycs = KYCRequest.query.filter_by(status='pending').order_by(KYCRequest.created_at.desc()).all()
    return jsonify([{"id": k.id, "full_name": k.full_name, "user_name": k.user.first_name if k.user else "", "id_image": getattr(k, 'id_front_image', None), "selfie_image": getattr(k, 'selfie_image', None), "created_at": k.created_at.isoformat()} for k in kycs])

@main.route("/admin/api/services", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_services_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    services = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all() if hasattr(ServiceRequest, 'created_at') else ServiceRequest.query.all()
    return jsonify([{"id": s.id, "service_name": getattr(s, 'service_name', 'طلب خدمة'), "user_name": s.user.first_name if hasattr(s, 'user') and s.user else "", "status": getattr(s, 'status', 'pending')} for s in services])

# 5. التدقيق المالي والأرشيف
@main.route("/admin/api/audit", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_audit_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    logs = FinancialAuditLog.query.order_by(FinancialAuditLog.id.desc()).limit(50).all()
    return jsonify([{"id": l.id, "action": l.action, "amount": float(l.amount) if l.amount else 0, "before": float(l.balance_before) if l.balance_before else 0, "after": float(l.balance_after) if l.balance_after else 0, "date": l.created_at.isoformat()} for l in logs])

@main.route("/admin/api/archive", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_archive_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    orders = Order.query.filter(Order.status.in_(['completed', 'failed', 'rejected', 'cancelled'])).order_by(Order.created_at.desc()).limit(50).all()
    deposits = Deposit.query.filter(Deposit.status.in_(['approved', 'rejected'])).order_by(Deposit.created_at.desc()).limit(50).all()
    
    combined = [{"type": "order", "id": o.id, "ref": o.order_number, "user": o.user.first_name if o.user else "", "amount": float(o.total_price), "status": o.status, "date": o.created_at.isoformat()} for o in orders] + \
               [{"type": "deposit", "id": d.id, "ref": d.transaction_id, "user": d.user.first_name if d.user else "", "amount": float(d.amount), "status": d.status, "date": d.created_at.isoformat()} for d in deposits]
    
    return jsonify(sorted(combined, key=lambda x: x['date'], reverse=True))

# 6. طرق الدفع والإعدادات والإشعارات
@main.route("/admin/api/payments", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_payments_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    if request.method == "POST":
        data = request.get_json()
        new_pay = PaymentMethod(name=data.get("name"), min_amount=float(data.get("min_amount", 0)), max_amount=float(data.get("max_amount", 0)), account_number=data.get("account_number"), is_active=True)
        db.session.add(new_pay)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify([{"id": p.id, "name": p.name, "min": float(p.min_amount), "max": float(p.max_amount), "account": p.account_number} for p in PaymentMethod.query.all()])

@main.route("/admin/api/payments/<int:id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_payment_v3(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    p = PaymentMethod.query.get(id)
    if p: db.session.delete(p); db.session.commit()
    return jsonify({"success": True})

@main.route("/admin/api/settings", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_settings_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    if request.method == "POST":
        for key, value in request.get_json().items():
            setting = Setting.query.filter_by(key=key).first()
            if setting: setting.value = str(value)
            else: db.session.add(Setting(key=key, value=str(value)))
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({s.key: s.value for s in Setting.query.all()})

@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
@handle_errors
def admin_send_notification_v3():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    message = data.get("message")
    target = data.get("target")
    
    if not message: return jsonify({"error": "الرسالة فارغة"}), 400

    # حفظ الإشعار في قاعدة البيانات ليظهر في الـ MiniApp
    if target == 'all':
        users = User.query.all()
        for u in users:
            db.session.add(Notification(user_id=u.id, title="إشعار إداري", message=message, type="info", is_read=False))
    else:
        user = User.query.filter_by(telegram_id=target).first()
        if user: db.session.add(Notification(user_id=user.id, title="إشعار إداري", message=message, type="info", is_read=False))
    
    db.session.commit()
    
    # إرسال عبر البوت أيضاً
    bot_token = os.getenv("BOT_TOKEN")
    if bot_token:
        if target == 'all':
            for u in users:
                try: requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={"chat_id": u.telegram_id, "text": message}, timeout=2)
                except: pass
        else:
            try: requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={"chat_id": target, "text": message}, timeout=2)
            except: pass
            
    return jsonify({"success": True, "count": 1 if target != 'all' else len(users)})
