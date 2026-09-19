"""
Helpers مشتركة — Error Codes + Pagination
SANAD PLUS⁺ v2.1
"""
from flask import jsonify, request


class ErrorCode:
    TOKEN_MISSING = "TOKEN_MISSING"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    TOKEN_REVOKED = "TOKEN_REVOKED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    USER_BANNED = "USER_BANNED"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    KYC_REQUIRED = "KYC_REQUIRED"
    KYC_ALREADY_PENDING = "KYC_ALREADY_PENDING"
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    NEGATIVE_NOT_ALLOWED = "NEGATIVE_NOT_ALLOWED"
    NEGATIVE_LIMIT_ZERO = "NEGATIVE_LIMIT_ZERO"
    NEGATIVE_LIMIT_EXCEEDED = "NEGATIVE_LIMIT_EXCEEDED"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    PRODUCT_INACTIVE = "PRODUCT_INACTIVE"
    STOCK_OUT = "STOCK_OUT"
    STOCK_INSUFFICIENT = "STOCK_INSUFFICIENT"
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    ORDER_NOT_CANCELLABLE = "ORDER_NOT_CANCELLABLE"
    ORDER_TIME_EXPIRED = "ORDER_TIME_EXPIRED"
    ORDER_INVALID_TRANSITION = "ORDER_INVALID_TRANSITION"
    COUPON_INVALID = "COUPON_INVALID"
    COUPON_EXPIRED = "COUPON_EXPIRED"
    COUPON_ALREADY_USED = "COUPON_ALREADY_USED"
    COUPON_MIN_AMOUNT = "COUPON_MIN_AMOUNT"
    COUPON_EXHAUSTED = "COUPON_EXHAUSTED"
    DEPOSIT_DUPLICATE = "DEPOSIT_DUPLICATE"
    DEPOSIT_INVALID = "DEPOSIT_INVALID"
    REFERRAL_SELF = "REFERRAL_SELF"
    REFERRAL_ALREADY_USED = "REFERRAL_ALREADY_USED"
    REFERRAL_INVALID = "REFERRAL_INVALID"
    RATE_LIMITED = "RATE_LIMITED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


def error_response(message, code=None, status=400, **extra):
    payload = {"error": message}
    if code:
        payload["code"] = code
    payload.update(extra)
    return jsonify(payload), status


def success_response(data=None, message=None, **extra):
    payload = {}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return jsonify(payload)


def paginate(query, default_limit=20, max_limit=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        limit = int(request.args.get("limit", default_limit))
        limit = min(max(1, limit), max_limit)
    except (ValueError, TypeError):
        limit = default_limit
    total = query.count()
    pages = (total + limit - 1) // limit if total > 0 else 0
    offset = (page - 1) * limit
    items = query.limit(limit).offset(offset).all()
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }
    }


def apply_sort(query, model, default="created_at DESC"):
    sort = request.args.get("sort", "newest")
    sort_map = {
        "newest": model.created_at.desc(),
        "oldest": model.created_at.asc(),
    }
    if hasattr(model, "total_price"):
        sort_map["price_high"] = model.total_price.desc()
        sort_map["price_low"] = model.total_price.asc()
    order_by = sort_map.get(sort, model.created_at.desc())
    return query.order_by(order_by)


def apply_date_range(query, model, field="created_at"):
    from datetime import datetime, timezone, timedelta
    col = getattr(model, field, None)
    if not col:
        return query
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    if from_date:
        try:
            dt = datetime.fromisoformat(from_date).replace(tzinfo=timezone.utc)
            query = query.filter(col >= dt)
        except (ValueError, TypeError):
            pass
    if to_date:
        try:
            dt = datetime.fromisoformat(to_date).replace(tzinfo=timezone.utc)
            dt = dt + timedelta(days=1)
            query = query.filter(col < dt)
        except (ValueError, TypeError):
            pass
    return query
