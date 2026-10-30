from decimal import Decimal, InvalidOperation
from uuid import uuid4
from app.services.ledger_service import record_transaction
import hmac
import hashlib
import json
import os
from urllib.parse import parse_qsl
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import User, Category, PaymentMethod, Deposit, Order, Product, KYCRequest, SupportTicket, SupportMessage, FinancialLedger
from app.telegram_auth import verify_telegram_auth
from app.decorators import require_telegram_auth, rate_limit
from app.services.cloudinary_service import upload_image

public_bp = Blueprint('public', __name__, url_prefix='/api')

@public_bp.route('/bot/auth', methods=['POST', 'OPTIONS'])
def bot_auth():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id') or data.get('id')
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
    if not user:
        user = User(telegram_id=int(tg_id), first_name=data.get('first_name', 'User'), balance=0.0)
        db.session.add(user)
        db.session.commit()
    return jsonify({"success": True, "user_id": user.id, "telegram_id": user.telegram_id, "balance": float(user.balance) if user.balance else 0.0, "first_name": getattr(user, 'first_name', 'مستخدم')})

@public_bp.route('/auth/telegram', methods=['POST', 'OPTIONS'])
def auth_telegram():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    init_data = data.get('initData')
    if not init_data: return jsonify({"error": "Missing initData"}), 400
    is_valid, user_data = verify_telegram_auth(init_data)
    if not is_valid: return jsonify({"error": "Unauthorized: " + user_data}), 401
    tg_id = int(user_data.get('id'))
    user = db.session.query(User).filter_by(telegram_id=tg_id).first()
    if not user:
        user = User(telegram_id=tg_id, first_name=user_data.get('first_name', 'User'), balance=0.0)
        db.session.add(user)
        db.session.commit()
    return jsonify({"success": True, "user_id": user.id, "is_verified": bool(getattr(user, "is_verified", False))})

@public_bp.route('/miniapp/init', methods=['POST', 'OPTIONS'])
@require_telegram_auth
def miniapp_init():
    if request.method == 'OPTIONS': return jsonify({}), 200
    user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
    if not user:
        user = User(telegram_id=g.telegram_id, first_name=g.telegram_user.get('first_name', 'مستخدم'), balance=Decimal('0.0000'), is_verified=False, is_banned=False)
        db.session.add(user)
        db.session.commit()
    from sqlalchemy import func, text
    total_deps = db.session.query(func.sum(Deposit.amount)).filter_by(user_id=user.id, status='approved').scalar()
    exchange_rate = 130.0
    try:
        rate_row = db.session.execute(text("SELECT value FROM app_settings WHERE key = 'exchange_rate'")).fetchone()
        if rate_row and rate_row[0]: exchange_rate = float(rate_row[0])
    except Exception: pass
    photo_url = g.telegram_user.get('photo_url', '')
    return jsonify({"balance": float(user.balance) if user.balance else 0.0, "first_name": getattr(user, 'first_name', 'مستخدم'), "sanad_id": f"SN-{user.id:03d}", "is_verified": getattr(user, 'is_verified', False), "total_deposits": float(total_deps) if total_deps else 0.0, "telegram_id": str(user.telegram_id), "photo_url": photo_url, "exchange_rate": exchange_rate})

@public_bp.route('/orders/', methods=['GET', 'OPTIONS'])
@require_telegram_auth
def get_user_orders():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user: return jsonify([])
        orders = db.session.query(Order).filter_by(user_id=user.id).order_by(Order.id.desc()).all()
        return jsonify([{"id": o.id, "order_number": getattr(o, 'order_number', f'ORD-{o.id}'), "product_name": getattr(o.product, 'name', 'منتج') if hasattr(o, 'product') and o.product else 'منتج', "amount": float(getattr(o, 'total_price', 0)), "quantity": getattr(o, 'quantity', 1), "delivery_data": getattr(o, 'delivery_data', 'غير متوفر'), "status": getattr(o, 'status', 'pending'), "date": o.created_at.isoformat() if hasattr(o, 'created_at') and o.created_at else ''} for o in orders])
    except Exception as e: return jsonify({"error": str(e)}), 500

@public_bp.route('/categories/', methods=['GET', 'OPTIONS'])
def get_categories():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        cats = db.session.query(Category).filter_by(is_active=True).all()
        return jsonify([{"id": c.id, "name": c.name, "image": getattr(c, 'image', '')} for c in cats])
    except Exception as e: return jsonify([])

@public_bp.route('/products/', methods=['GET', 'OPTIONS'])
def get_products():
    if request.method == 'OPTIONS': return jsonify({}), 200
    cat_id = request.args.get('category_id')
    try:
        query = db.session.query(Product)
        if cat_id: query = query.filter_by(category_id=int(cat_id))
        products = query.all()
        return jsonify([{"id": p.id, "name": getattr(p, 'name', 'منتج'), "price": float(getattr(p, 'base_price', 0)), "image": getattr(p, 'image', '')} for p in products])
    except Exception as e: return jsonify({"error": str(e)}), 500

@public_bp.route('/kyc/status', methods=['GET', 'OPTIONS'])
@require_telegram_auth
def kyc_status():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user: return jsonify({"status": "not_found"}), 404
        kyc = db.session.query(KYCRequest).filter_by(user_id=user.id).first()
        if kyc: return jsonify({"status": kyc.status, "full_name": kyc.full_name})
        return jsonify({"status": "none"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@public_bp.route('/kyc/submit', methods=['POST'])
@require_telegram_auth
def kyc_submit():
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user: return jsonify({"error": "User not found"}), 404
        full_name = request.form.get('full_name')
        phone = request.form.get('phone')
        governorate = request.form.get('governorate', '')
        region = request.form.get('region', '')
        address = f"{governorate} - {region}" if governorate else request.form.get('address', '')
        if not full_name or not phone: return jsonify({"error": "الاسم ورقم الهاتف مطلوبان"}), 400
        id_front_url = upload_image(request.files['id_front'], folder="sanad_kyc", is_kyc=True) if 'id_front' in request.files else None
        selfie_url = upload_image(request.files['selfie'], folder="sanad_kyc", is_kyc=True) if 'selfie' in request.files else None
        kyc = db.session.query(KYCRequest).filter_by(user_id=user.id).first()
        if not kyc:
            kyc = KYCRequest(user_id=user.id)
            db.session.add(kyc)
        kyc.full_name = full_name
        kyc.phone = phone
        kyc.address = address
        if id_front_url: 
            if hasattr(kyc, 'id_image'): kyc.id_image = id_front_url
            else: kyc.id_front_image = id_front_url
        if selfie_url: kyc.selfie_image = selfie_url
        kyc.status = 'pending'
        db.session.commit()
        return jsonify({"success": True, "message": "تم إرسال طلب التوثيق بنجاح"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@public_bp.route('/support/messages', methods=['GET', 'OPTIONS'])
@require_telegram_auth
def get_support_messages():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user: return jsonify([])
        ticket = db.session.query(SupportTicket).filter_by(user_id=user.id).first()
        if not ticket: return jsonify([])
        msgs = db.session.query(SupportMessage).filter_by(ticket_id=ticket.id).order_by(SupportMessage.created_at.asc()).all()
        return jsonify([{"id": m.id, "sender": m.sender_type, "message": m.message, "text": m.message, "date": str(m.created_at)} for m in msgs])
    except Exception as e: return jsonify({"error": str(e)}), 500

@public_bp.route('/support/send', methods=['POST'])
@require_telegram_auth
@rate_limit(max_requests=8, window_seconds=60)
def send_support_message():
    data = request.get_json(silent=True) or {}
    msg = data.get('message')
    if not msg: return jsonify({"error": "Missing data"}), 400
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user:
            user = User(telegram_id=g.telegram_id, first_name=g.telegram_user.get('first_name', 'مستخدم'), balance=Decimal('0.0000'))
            db.session.add(user)
            db.session.commit()
        ticket = db.session.query(SupportTicket).filter_by(user_id=user.id, status='open').first()
        if not ticket:
            ticket = SupportTicket(user_id=user.id, status='open')
            db.session.add(ticket)
            db.session.commit()
        new_msg = SupportMessage(ticket_id=ticket.id, sender_type='user', message=str(msg).strip()[:4000])
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@public_bp.route('/faq', methods=['GET'])
def get_faq():
    return jsonify([{"q": "كيف أقوم بشحن رصيدي؟", "a": "يمكنك الشحن عبر قسم (شحن الرصيد)."}, {"q": "كم يستغرق توثيق الحساب؟", "a": "يتم المراجعة خلال 24 ساعة."}])

@public_bp.route('/orders/create', methods=['POST'])
@require_telegram_auth
def create_order():
    data = request.get_json(silent=True) or {}
    product_id = data.get('product_id')
    raw_quantity = data.get('quantity', 1)
    customer_note = str(data.get('customer_note', '') or '').strip()[:1000]
    if not product_id: return jsonify({"error": "بيانات ناقصة"}), 400
    try: quantity = int(raw_quantity)
    except: return jsonify({"error": "الكمية غير صالحة"}), 400
    if quantity < 1 or quantity > 1000: return jsonify({"error": "الكمية يجب أن تكون بين 1 و1000"}), 400
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).with_for_update().first()
        product = db.session.query(Product).filter_by(id=product_id, is_active=True, deleted_at=None).with_for_update().first()
        if not user or not product: return jsonify({"error": "المستخدم أو المنتج غير متاح"}), 404
        if user.is_banned: return jsonify({"error": "الحساب موقوف"}), 403
        unit_price = Decimal(str(product.base_price))
        total_price = (unit_price * quantity).quantize(Decimal("0.0001"))
        old_balance = Decimal(str(user.balance or "0")).quantize(Decimal("0.0001"))
        if old_balance < total_price: return jsonify({"error": "رصيدك غير كافٍ"}), 400
        order_number = f"ORD-{uuid4().hex[:8].upper()}"
        new_balance = old_balance - total_price
        user.balance = new_balance
        new_order = Order(order_number=order_number, user_id=user.id, product_id=product.id, quantity=quantity, unit_price=unit_price, total_price=total_price, status="pending", customer_note=customer_note)
        db.session.add(new_order)
        db.session.flush()
        record_transaction(user.id, "purchase", -total_price, old_balance, new_balance, reference=order_number, description=f"شراء {product.name}")
        db.session.commit()
        return jsonify({"success": True, "order_id": new_order.id, "new_balance": float(new_balance)})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@public_bp.route('/payment-methods/', methods=['GET', 'OPTIONS'])
def get_payment_methods():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        methods = db.session.query(PaymentMethod).filter_by(is_active=True, deleted_at=None).order_by(PaymentMethod.id.asc()).all()
        return jsonify([{"id": item.id, "name": item.name, "account": item.account or "", "image": item.image or item.icon or "", "icon": item.icon or "", "notes": item.notes or "", "min_amount": float(item.min_amount or 0), "max_amount": float(item.max_amount or 0)} for item in methods])
    except Exception:
        db.session.rollback()
        return jsonify({"error": "تعذر جلب طرق الدفع"}), 500

@public_bp.route('/deposits/create', methods=['POST', 'OPTIONS'])
@require_telegram_auth
@rate_limit(max_requests=5, window_seconds=60)
def create_deposit():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).with_for_update().first()
        if not user or user.is_banned: return jsonify({"error": "الحساب موقوف أو غير موجود"}), 403
        raw_amount = request.form.get('amount', '')
        reference = str(request.form.get('reference', '') or '').strip()
        try: amount = Decimal(raw_amount).quantize(Decimal('0.0001'))
        except: return jsonify({"error": "المبلغ غير صالح"}), 400
        if not amount.is_finite() or amount <= 0 or amount > Decimal('1000000'): return jsonify({"error": "المبلغ غير صالح"}), 400
        if not reference or len(reference) > 100: return jsonify({"error": "رقم العملية مطلوب"}), 400
        receipt = request.files.get('receipt')
        if not receipt or not receipt.filename or not (receipt.mimetype or '').lower().startswith('image/'): return jsonify({"error": "صورة الإيصال مطلوبة"}), 400
        if db.session.query(Deposit).filter_by(transaction_id=reference).first(): return jsonify({"error": "رقم العملية مستخدم مسبقاً"}), 409
        receipt_url = upload_image(receipt, folder="sanad_receipts")
        if not receipt_url or 'Cloudinary+Missing' in str(receipt_url): return jsonify({"error": "خدمة رفع الصور غير مهيأة"}), 503
        deposit = Deposit(user_id=user.id, amount=amount, transaction_id=reference, receipt_image=receipt_url, status='pending')
        db.session.add(deposit)
        db.session.commit()
        return jsonify({"success": True, "deposit_id": deposit.id, "status": deposit.status}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "تعذر إنشاء طلب الإيداع"}), 500

@public_bp.route('/deposits/', methods=['GET', 'OPTIONS'])
@require_telegram_auth
def get_user_deposits():
    if request.method == 'OPTIONS': return jsonify({}), 200
    user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
    if not user: return jsonify({"items": [], "total": 0}), 200
    try:
        page = request.args.get('page', 1, type=int)
        pagination = db.session.query(Deposit).filter_by(user_id=user.id).order_by(Deposit.id.desc()).paginate(page=page, per_page=10, error_out=False)
        return jsonify({"items": [{"id": d.id, "amount": float(d.amount), "status": d.status, "reference": getattr(d, 'transaction_id', ''), "date": d.created_at.isoformat() if d.created_at else ''} for d in pagination.items], "has_next": pagination.has_next, "total": pagination.total})
    except Exception as e: return jsonify({"items": [], "total": 0}), 500

@public_bp.route('/ledger', methods=['GET', 'OPTIONS'])
@require_telegram_auth
def get_user_ledger():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        user = db.session.query(User).filter_by(telegram_id=g.telegram_id).first()
        if not user: return jsonify([])
        records = db.session.query(FinancialLedger).filter_by(user_id=user.id).order_by(FinancialLedger.created_at.desc()).all()
        return jsonify([{"id": r.id, "type": r.action_type, "amount": float(r.amount), "before": float(r.balance_before), "after": float(r.balance_after), "ref": r.reference, "desc": r.description, "date": r.created_at.isoformat() if r.created_at else ''} for r in records])
    except Exception as e: return jsonify({"error": str(e)}), 500
