# ============================================================
# 💰 Deposits Routes — v18.2
# ============================================================
# Endpoints:
#   GET  /api/deposits/         → user's deposits (list)
#   POST /api/deposits/create   → create new deposit
# ============================================================
# 🆕 v18.2:
#   - رفع الصور إلى Cloudinary (public_id فقط في DB، لا base64)
#   - سقف تراكمي يومي (pending + approved)
#   - حد أقصى للإيداعات المعلّقة
#   - Decimal لكل الحسابات
# ============================================================
import re
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Deposit, PaymentMethod, Notification, log_financial,
)
from ..extensions import db
from . import main
from ..services.cloudinary_service import (
    upload_signed_image,
    get_signed_url,
)
from ..services.telegram_service import notify_admins


# ════════════════════════════════════════════════════════════
# سياسة الإيداع
# ════════════════════════════════════════════════════════════
DAILY_DEPOSIT_CAP = Decimal('200.0000')      # سقف 24 ساعة (pending + approved)
NEW_USER_CAP = Decimal('50.0000')            # أول 7 أيام
NEW_USER_DAYS = 7
PENDING_DEPOSITS_MAX = 3                     # عدد معلّق في اللحظة
MAX_PROOF_SIZE_BYTES = 3 * 1024 * 1024       # 3MB base64


ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════
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
    """تحويل Deposit إلى dict للـ JSON"""
    proof_url = None
    if d.proof_image:
        try:
            proof_url = get_signed_url(d.proof_image, expires_in=1800)
        except Exception:
            proof_url = None

    return {
        "id": d.id,
        "transaction_id": d.transaction_id,
        "amount": _f(d.amount),
        "currency": d.currency,
        "method": d.method,
        "method_id": d.method_id,
        "status": d.status,
        "admin_note": d.admin_note,
        "proof_image": proof_url,
        "sender_name": d.sender_name,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "reviewed_at": d.reviewed_at.isoformat() if d.reviewed_at else None,
    }


def _validate_proof_image(data_url):
    """تحقق من صحة الصورة (MIME + Size + Magic Bytes)"""
    if not data_url or not isinstance(data_url, str):
        return False, "الصورة مطلوبة", None

    if len(data_url) > MAX_PROOF_SIZE_BYTES:
        return False, "الصورة كبيرة جداً (الحد 3 MB)", None

    if not data_url.startswith("data:image/"):
        return False, "صيغة الصورة غير صحيحة", None

    match = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        return False, "بيانات Base64 تالفة", None

    mime_type, b64_data = match.group(1), match.group(2)

    if mime_type not in ALLOWED_MIME_TYPES:
        return False, f"صيغة غير مدعومة ({mime_type})", None

    try:
        import base64
        binary_data = base64.b64decode(b64_data, validate=True)
    except Exception:
        return False, "بيانات Base64 تالفة", None

    if len(binary_data) < 100:
        return False, "الصورة صغيرة جداً", None

    signatures = ALLOWED_MIME_TYPES[mime_type]
    if not any(binary_data.startswith(sig) for sig in signatures):
        return False, "محتوى الملف لا يطابق الصيغة", None

    if mime_type == "image/webp":
        if len(binary_data) < 12 or binary_data[8:12] != b"WEBP":
            return False, "ملف WebP تالف", None

    return True, None, mime_type


def _daily_total(user_id):
    """
    مجموع الإيداعات (pending + approved) في آخر 24 ساعة.
    ⚠️ يشمل pending — لمنع الغسل عبر إيداعات معلّقة متعددة.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    result = db.session.query(
        db.func.coalesce(db.func.sum(Deposit.amount), 0)
    ).filter(
        Deposit.user_id == user_id,
        Deposit.created_at >= cutoff,
        Deposit.status.in_(['pending', 'approved']),
    ).scalar()

    return _d(result)


def _pending_count(user_id):
    return Deposit.query.filter_by(user_id=user_id, status='pending').count()


# ════════════════════════════════════════════════════════════
# GET /api/deposits/ — list user deposits
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
# POST /api/deposits/create
# ════════════════════════════════════════════════════════════
@main.route("/api/deposits/create", methods=["POST"])
@main.route("/api/deposits", methods=["POST"])
@jwt_required()
def create_deposit():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.is_banned:
        return jsonify({"error": "حسابك موقوف", "code": "USER_BANNED"}), 403

    # ═══ KYC Gate ═══
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

    if not method_id:
        return jsonify({"error": "طريقة الدفع مطلوبة"}), 400
    if amount_raw is None:
        return jsonify({"error": "المبلغ مطلوب"}), 400
    if not sender_name:
        return jsonify({"error": "اسم المرسل مطلوب"}), 400
    if not proof_image:
        return jsonify({"error": "صورة الإثبات مطلوبة"}), 400

    # ═══ Idempotency ═══
    if idempotency_key:
        existing = Deposit.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "transaction_id": existing.transaction_id,
                "status": existing.status,
                "idempotent": True,
            }), 200

    # ═══ طريقة الدفع ═══
    method = PaymentMethod.query.filter_by(id=method_id, is_active=True).first()
    if not method:
        return jsonify({"error": "طريقة الدفع غير متوفرة"}), 404

    # ═══ المبلغ ═══
    try:
        amount_d = _d(amount_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    if amount_d <= 0:
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    # حد أدنى
    if method.min_amount and amount_d < _d(method.min_amount):
        return jsonify({
            "error": f"الحد الأدنى {_f(method.min_amount)}$",
            "code": "AMOUNT_BELOW_MIN",
        }), 400

    # حد أقصى
    max_amount = _d(method.max_amount) if method.max_amount else Decimal('500.0000')
    if amount_d > max_amount:
        return jsonify({
            "error": f"الحد الأقصى {_f(max_amount)}$",
            "code": "AMOUNT_ABOVE_MAX",
        }), 400

    # ═══ التحقق من الصورة ═══
    is_valid, error_msg, mime_type = _validate_proof_image(proof_image)
    if not is_valid:
        return jsonify({
            "error": error_msg,
            "code": "IMAGE_INVALID",
        }), 400

    # ═══ السقف اليومي (pending + approved في 24 ساعة) ═══
    daily_used = _daily_total(user.id)

    cap = DAILY_DEPOSIT_CAP
    account_age_days = 999
    if user.created_at:
        account_age_days = (datetime.now(timezone.utc) - user.created_at).days
    if account_age_days < NEW_USER_DAYS:
        cap = NEW_USER_CAP

    if daily_used + amount_d > cap:
        return jsonify({
            "error": f"بلغت سقف اليوم ({_f(cap)}$)",
            "code": "DAILY_CAP_REACHED",
            "used": _f(daily_used),
            "cap": _f(cap),
        }), 400

    # ═══ عدد المعلّق ═══
    pending = _pending_count(user.id)
    if pending >= PENDING_DEPOSITS_MAX:
        return jsonify({
            "error": f"لديك {pending} إيداعات قيد المراجعة — انتظر",
            "code": "TOO_MANY_PENDING",
            "pending": pending,
            "max": PENDING_DEPOSITS_MAX,
        }), 400

    # ═══ رفع الصورة إلى Cloudinary (authenticated/private) ═══
    try:
        public_id = upload_signed_image(
            proof_image,
            folder=f"sanad/deposits/{user.id}",
        )
        if not public_id:
            return jsonify({
                "error": "فشل رفع الصورة — حاول مجدداً",
                "code": "UPLOAD_FAILED",
            }), 500
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        return jsonify({
            "error": "فشل رفع الصورة",
            "code": "UPLOAD_FAILED",
        }), 500

    # ═══ إنشاء الإيداع ═══
    try:
        deposit = Deposit(
            user_id=user.id,
            amount=amount_d,
            currency='USD',
            method_id=method.id,
            method=method.name,
            proof_image=public_id,       # public_id فقط، لا base64
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