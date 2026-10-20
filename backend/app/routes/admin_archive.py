"""Admin Archive, Logs, Notifications & Services Routes"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import User, Order, Product, Category, Deposit, PaymentMethod, KYCRequest, Notification, ServiceRequest, Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, AdminActivity, ProductBundle, UserProductDiscount, AdminOTPSession, log_financial
from ..services.cache_service import invalidate_admin, cache_get
from . import main
from .admin_utils import is_admin_user, handle_errors
from app.middleware import admin_required
from .admin import log_admin_activity, get_arabic_status
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
from decimal import Decimal

@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
@handle_errors
def admin_send_notification():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    target = data.get("target", "all")
    title = data.get("title", "إشعار")
    message = data.get("message", "")
    ntype = data.get("type", "info")

    if target == "all":
        for u in User.query.all():
            db.session.add(Notification(user_id=u.id, title=title, message=message, type=ntype))
    else:
        uid = data.get("user_id")
        if uid:
            db.session.add(Notification(user_id=uid, title=title, message=message, type=ntype))

    db.session.commit()
    return jsonify({"success": True})

# ============================================================
# Service Requests — 🆕 v18.1: joinedload + cached
# ============================================================

@main.route("/admin/api/service-requests", methods=["GET"])
@jwt_required()
@handle_errors
def admin_service_requests():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("service-requests"))
    if cached is not None:
        return jsonify(cached)

    reqs = (
        ServiceRequest.query
        .filter(ServiceRequest.status == 'pending')
        .options(joinedload(ServiceRequest.user))
        .order_by(ServiceRequest.created_at.desc())
        .all()
    )

    result = [{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs]

    cache_set(key_admin_list("service-requests"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)

@main.route("/admin/api/service-requests/<int:req_id>", methods=["PUT"])
@jwt_required()
@handle_errors
def admin_update_service_request(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "غير موجود"}), 404
    if "status" in data: req.status = data["status"]
    if "admin_response" in data: req.admin_response = data["admin_response"]
    db.session.commit()

    invalidate_admin("service-requests")

    return jsonify({"success": True})

# ============================================================
# Settings — 🆕 v18.1: invalidates public cache
# ============================================================

@main.route("/admin/api/activities", methods=["GET"])
@jwt_required()
@handle_errors
def admin_activities():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    acts = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(200).all()
    return jsonify([{
        "id": a.id, "admin_id": a.admin_id, "action": a.action,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in acts])

@main.route("/admin/api/audit-log", methods=["GET"])
@jwt_required()
@handle_errors
def admin_audit_log():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user_id = request.args.get("user_id", type=int)
    action = request.args.get("action")
    limit = min(int(request.args.get("limit", 100)), 500)

    q = FinancialAuditLog.query
    if user_id: q = q.filter_by(user_id=user_id)
    if action: q = q.filter_by(action=action)
    logs = q.order_by(FinancialAuditLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "amount": l.amount, "balance_before": l.balance_before, "balance_after": l.balance_after,
        "reference_type": l.reference_type, "reference_id": l.reference_id,
        "admin_id": l.admin_id, "ip_address": l.ip_address, "note": l.note,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs])

# ============================================================
# 🆕 v16: ARCHIVE — 🆕 v18.1: joinedload
# ============================================================

@main.route("/admin/api/archive/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    orders = (
        Order.query
        .filter(Order.status.in_(['completed', 'cancelled', 'failed']))
        .options(joinedload(Order.user), joinedload(Order.product))
        .order_by(Order.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for o in orders:
        product = o.product
        user = o.user
        result.append({
            "id": o.id, "order_number": o.order_number, "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "quantity": o.quantity, "unit_price": o.unit_price,
            "total_price": o.total_price, "discount_amount": o.discount_amount or 0,
            "coupon_code": o.coupon_code, "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return jsonify(result)

@main.route("/admin/api/archive/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    deposits = (
        Deposit.query
        .filter(Deposit.status.in_(['approved', 'rejected']))
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for d in deposits:
        user = d.user
        result.append({
            "id": d.id, "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "amount": d.amount, "method": d.method, "method_id": d.method_id,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "transaction_id": d.transaction_id,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return jsonify(result)

@main.route("/admin/api/archive/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    kycs = (
        KYCRequest.query
        .filter(KYCRequest.status.in_(['approved', 'rejected']))
        .options(joinedload(KYCRequest.user))
        .order_by(KYCRequest.submitted_at.desc())
        .limit(200)
        .all()
    )

    return jsonify([{
        "id": k.id, "user_id": k.user_id, "full_name": k.full_name,
        "phone": k.phone, "address": k.address,
        "selfie_image": get_signed_url(k.selfie_image, expires_in=1800) if k.selfie_image else None,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs])

@main.route("/admin/api/archive/services", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_services():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    reqs = (
        ServiceRequest.query
        .filter(ServiceRequest.status.in_(['completed', 'rejected', 'cancelled']))
        .options(joinedload(ServiceRequest.user))
        .order_by(ServiceRequest.created_at.desc())
        .limit(200)
        .all()
    )

    return jsonify([{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs])

@main.route("/admin/api/archive/counts", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_counts():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    return jsonify({
        "orders": Order.query.filter(
            Order.status.in_(['completed', 'cancelled', 'failed'])
        ).count(),
        "deposits": Deposit.query.filter(
            Deposit.status.in_(['approved', 'rejected'])
        ).count(),
        "kyc": KYCRequest.query.filter(
            KYCRequest.status.in_(['approved', 'rejected'])
        ).count(),
        "services": ServiceRequest.query.filter(
            ServiceRequest.status.in_(['completed', 'rejected', 'cancelled'])
        ).count(),
    })

# ============================================================
# 🆕 v16: RESTORE
# ============================================================

@main.route("/admin/api/orders/<int:order_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_order(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    if order.status not in ['completed', 'cancelled', 'failed']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    order.status = "pending"
    order.cancelled_at = None
    order.completed_at = None
    order.failed_at = None
    order.updated_at = datetime.now(timezone.utc)

    log_admin_activity(f"استرجاع الطلب {order.order_number} من الأرشيف")
    db.session.commit()

    invalidate_admin("orders")

    return jsonify({"success": True, "status": order.status})

@main.route("/admin/api/deposits/<int:deposit_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status not in ['approved', 'rejected']:
        return jsonify({"error": "الإيداع ليس مؤرشفاً"}), 400

    deposit.status = "pending"
    deposit.reviewed_at = None
    deposit.admin_note = None

    log_admin_activity(f"استرجاع الإيداع {deposit.transaction_id}")
    db.session.commit()

    invalidate_admin("deposits")

    return jsonify({"success": True, "status": deposit.status})

@main.route("/admin/api/kyc/<int:kyc_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404
    if kyc.status not in ['approved', 'rejected']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    kyc.status = "pending"
    kyc.reviewed_at = None
    kyc.admin_note = None

    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "pending"
        user.is_verified = False

    log_admin_activity(f"استرجاع KYC {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    return jsonify({"success": True, "status": kyc.status})

@main.route("/admin/api/services/<int:req_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_service(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "غير موجود"}), 404
    if req.status not in ['completed', 'rejected', 'cancelled']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    req.status = "pending"
    req.admin_response = None

    log_admin_activity(f"استرجاع طلب خدمة {req.id}")
    db.session.commit()

    invalidate_admin("service-requests")

    return jsonify({"success": True, "status": req.status})

# ============================================================
# 🆕 v18.3.8: Admin Inbox
# ============================================================

@main.route("/admin/api/inbox", methods=["GET"])
@jwt_required()
@handle_errors
def admin_inbox():
    """
    شاشة موحّدة لكل ما يحتاج مراجعة:
    - Pending deposits
    - Pending orders (pending/review)
    - Pending KYC
    - Pending service requests
    """
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    LIMIT = 5

    # ═══ Deposits ═══
    deposits_q = (
        Deposit.query
        .filter(Deposit.status == 'pending')
        .order_by(Deposit.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_deposits = []
    for d in deposits_q:
        user = User.query.get(d.user_id)
        pending_deposits.append({
            "id": d.id,
            "transaction_id": d.transaction_id,
            "amount": float(d.amount or 0),
            "fee": float(d.fee or 0),
            "method": d.method,
            "method_id": d.method_id,
            "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    # ═══ Orders ═══
    orders_q = (
        Order.query
        .filter(Order.status.in_(['pending', 'review']))
        .order_by(Order.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_orders = []
    for o in orders_q:
        user = User.query.get(o.user_id)
        product = Product.query.get(o.product_id)
        pending_orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "quantity": o.quantity,
            "total_price": float(o.total_price or 0),
            "unit_price": float(o.unit_price or 0),
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    # ═══ KYC ═══
    kyc_q = (
        KYCRequest.query
        .filter(KYCRequest.status == 'pending')
        .order_by(KYCRequest.submitted_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_kyc = []
    for k in kyc_q:
        user = User.query.get(k.user_id)
        pending_kyc.append({
            "id": k.id,
            "user_id": k.user_id,
            "user_telegram": user.telegram_id if user else None,
            "full_name": k.full_name,
            "phone": k.phone,
            "address": k.address,
            "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
        })

    # ═══ Services ═══
    services_q = (
        ServiceRequest.query
        .filter(ServiceRequest.status == 'pending')
        .order_by(ServiceRequest.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_services = []
    for r in services_q:
        user = User.query.get(r.user_id)
        pending_services.append({
            "id": r.id,
            "service_name": r.service_name,
            "description": r.description,
            "estimated_price": float(r.estimated_price) if r.estimated_price else None,
            "user_id": r.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # ═══ Counts ═══
    counts = {
        "deposits": Deposit.query.filter(Deposit.status == 'pending').count(),
        "orders": Order.query.filter(Order.status.in_(['pending', 'review'])).count(),
        "kyc": KYCRequest.query.filter(KYCRequest.status == 'pending').count(),
        "services": ServiceRequest.query.filter(ServiceRequest.status == 'pending').count(),
    }
    counts["total"] = sum(counts.values())

    return jsonify({
        "pending_deposits": pending_deposits,
        "pending_orders": pending_orders,
        "pending_kyc": pending_kyc,
        "pending_services": pending_services,
        "counts": counts,
    })