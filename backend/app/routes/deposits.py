# ============================================================
# 💰 Deposits Routes — v18.3.0 (base64 in DB, no Cloudinary)
# ============================================================
# Endpoints:
#   GET  /api/deposits/         → list
#   GET  /api/deposits          → alias
#   POST /api/deposits/create   → create
#   POST /api/deposits          → alias
#   POST /api/deposits/         → alias
# ============================================================
# v18.3.0:
#   - تخزين الصورة base64 في DB (بدون Cloudinary)
#   - حل مشكلة datetime naive/aware
#   - كشف idempotency مبكّر
# ============================================================
import re
import uuid
import base64
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Deposit, PaymentMethod, Notification,
)
from ..extensions import db
from . import main
from ..services.telegram_service import notify_admins


# ════════════════════════════════════════════════════════════
# Constants
# ════════════════════════════════════════════════════════════
MAX_DATA_URL_LENGTH = 3 * 1024 * 1024       # 3 MB base64
MAX_BINARY_SIZE = 2 * 1024 * 1024           # 2 MB binary
# 🆕 v18.3.6: أُزيلت DAILY_DEPOSIT_CAP و NEW_USER_CAP — الأدمن يحدد min/max لكل طريقة
PENDING_DEPOSITS_MAX = 3

ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════
def _aware(dt):
    """يحوّل naive datetime إلى aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _utcnow():
    return datetime.now(timezone.utc)


def _d(v):
    if v is None:
        return Decimal('0.0000')
    if isinstance(v, Decimal):
        return v.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    return Decimal(str(v)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


def _f(v):
    if v is None:
        return 0.0
    return float(v)


def _get_user():
    ident = get_jwt_identity()
    if not ident:
        return None
    try:
        return User.query.get(int(ident))
    except (ValueError, TypeError):
        return None


def _serialize_deposit(d):
    """تحويل Deposit → JSON. proof_image يُرجَع كما هو (base64 أو URL)."""
    return {
        "id": d.id,
        "transaction_id": d.transaction_id,
        "amount": _f(d.amount),
        "fee": _f(d.fee) if d.fee else 0.0,
        "currency": d.currency,
        "method": d.method,
        "method_id": d.method_id,
        "status": d.status,
        "admin_note": d.admin_note,
        "proof_image": d.proof_image if d.proof_image else None,
        "sender_name": d.sender_name,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "reviewed_at": d.reviewed_at.isoformat() if d.reviewed_at else None,
    }


def _validate_image(data_url):
    """تحقق MIME + size + magic bytes."""
    if not data_url or not isinstance(data_url, str):
        return False, "الصورة مطلوبة"

    if len(data_url) > MAX_DATA_URL_LENGTH:
        return False, "الصورة كبيرة جداً (الحد 3 MB)"

    if not data_url.startswith("data:image/"):
        return False, "صيغة الصورة غير صحيحة"

    match = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        return False, "بيانات Base64 تالفة"

    mime_type, b64_data = match.group(1), match.group(2)

    if mime_type not in ALLOWED_MIME_TYPES:
        return False, f"صيغة غير مدعومة ({mime_type})"

    try:
        binary = base64.b64decode(b64_data, validate=True)
    except Exception:
        return False, "بيانات Base64 تالفة"

    if len(binary) < 100:
        return False, "الصورة صغيرة جداً"

    if len(binary) > MAX_BINARY_SIZE:
        return False, "الصورة كبيرة جداً بعد فك الترميز"

    if not any(binary.startswith(sig) for sig in ALLOWED_MIME_TYPES[mime_type]):
        return False, "محتوى الملف لا يطابق الصيغة"

    if mime_type == "image/webp":
        if len(binary) < 12 or binary[8:12] != b"WEBP":
            return False, "ملف WebP تالف"

    return True, None


def _pending_count(user_id):
    return Deposit.query.filter_by(user_id=user_id, status='pending').count()


def _calculate_fee(method, amount_d):
    """🆕 v18.3.6: احسب الرسوم (percentage أو fixed)"""
    if not method or not method.fee:
        return Decimal('0.0000')
    fee_val = _d(method.fee)
    if fee_val <= 0:
        return Decimal('0.0000')
    fee_type = method.fee_type or 'percentage'
    if fee_type == 'percentage':
        return (amount_d * fee_val / Decimal('100')).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    else:  # fixed
        if fee_val > amount_d:
            return amount_d
        return fee_val.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


# ════════════════════════════════════════════════════════════
# GET /api/deposits/
# ════════════════════════════════════════════════════════════
@main.route("/api/deposits/", methods=["GET"])
@main.route("/api/deposits", methods=["GET"])
@jwt_required()
def list_deposits():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except (ValueError, TypeError):
        limit, offset = 50, 0

    deposits = (
        Deposit.query
        .filter_by(user_id=user.id)
        .order_by(Deposit.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify([_serialize_deposit(d) for d in deposits])


# ════════════════════════════════════════════════════════════
# POST /api/deposits/ — create
# ════════════════════════════════════════════════════════════
@main.route("/api/deposits/create", methods=["POST"])
@main.route("/api/deposits", methods=["POST"])
@main.route("/api/deposits/", methods=["POST"])
@jwt_required()
def create_deposit():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.is_banned:
        return jsonify({"error": "حسابك موقوف", "code": "USER_BANNED"}), 403

    if user.kyc_status != 'verified' and not user.is_verified:
        return jsonify({
            "error": "يجب توثيق حسابك أولاً",
            "code": "KYC_REQUIRED",
        }), 403

    data = request.get_json() or {}
    method_id = data.get("method_id") or data.get("method")
    amount_raw = data.get("amount")
    sender_name = (data.get("sender_name") or "").strip()
    proof_image = data.get("proof_image", "")
    idempotency_key = (data.get("idempotency_key") or "").strip() or None

    # Idempotency — مبكر جداً
    if idempotency_key:
        existing = Deposit.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "transaction_id": existing.transaction_id,
                "status": existing.status,
                "idempotent": True,
            }), 200

    if not method_id:
        return jsonify({"error": "طريقة الدفع مطلوبة"}), 400
    if amount_raw is None:
        return jsonify({"error": "المبلغ مطلوب"}), 400
    if not sender_name:
        return jsonify({"error": "اسم المرسل مطلوب"}), 400
    if not proof_image:
        return jsonify({"error": "صورة الإثبات مطلوبة"}), 400

    method = PaymentMethod.query.filter_by(id=method_id, is_active=True).first()
    if not method:
        return jsonify({"error": "طريقة الدفع غير متوفرة"}), 404

    try:
        amount_d = _d(amount_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    if amount_d <= 0:
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    if method.min_amount and amount_d < _d(method.min_amount):
        return jsonify({
            "error": f"الحد الأدنى {_f(method.min_amount)}$",
            "code": "AMOUNT_BELOW_MIN",
        }), 400

    # 🆕 v18.3.6: max_amount مع fallback آمن
    try:
        max_amount = _d(method.max_amount) if method.max_amount else Decimal('500.0000')
    except AttributeError:
        max_amount = Decimal('500.0000')
    if amount_d > max_amount:
        return jsonify({
            "error": f"الحد الأقصى {_f(max_amount)}$",
            "code": "AMOUNT_ABOVE_MAX",
        }), 400

    # Validate image
    is_valid, error_msg = _validate_image(proof_image)
    if not is_valid:
        return jsonify({
            "error": error_msg,
            "code": "IMAGE_INVALID",
        }), 400

    # 🆕 v18.3.6: أُزيل السقف اليومي — الأدمن يحدد min/max لكل طريقة
    # Pending count
    pending = _pending_count(user.id)
    if pending >= PENDING_DEPOSITS_MAX:
        return jsonify({
            "error": f"لديك {pending} إيداعات قيد المراجعة — انتظر",
            "code": "TOO_MANY_PENDING",
            "pending": pending,
            "max": PENDING_DEPOSITS_MAX,
        }), 400

    # ═══ احسب الرسوم ═══
    fee_amount = _calculate_fee(method, amount_d)

    # ═══ إنشاء الإيداع — الصورة base64 مباشرة في DB ═══
    try:
        deposit = Deposit(
            user_id=user.id,
            amount=amount_d,
            fee=fee_amount,
            currency='USD',
            method_id=method.id,
            method=method.name,
            proof_image=proof_image,
            sender_name=sender_name,
            transaction_id='DEP-' + uuid.uuid4().hex[:8].upper(),
            status='pending',
            idempotency_key=idempotency_key,
        )
        db.session.add(deposit)
        db.session.add(Notification(
            user_id=user.id,
            title='إيداع قيد المراجعة',
            message=f'تم استلام إيداعك بقيمة {_f(amount_d)}$ — سيُراجع قريباً',
            type='info',
        ))
        db.session.commit()

        try:
            notify_admins(
                f'💰 إيداع جديد: {deposit.transaction_id}\n'
                f'المبلغ: {_f(amount_d)}$\n'
                f'من: {user.telegram_id}'
            )
        except Exception:
            pass

        return jsonify({
            'transaction_id': deposit.transaction_id,
            'status': deposit.status,
            'amount': _f(amount_d),
            'fee': _f(fee_amount),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ create_deposit error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'فشل إنشاء الإيداع',
            'code': 'INTERNAL_ERROR',
        }), 500