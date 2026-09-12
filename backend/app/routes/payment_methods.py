from flask import jsonify
from ..models.base import PaymentMethod
from . import main


@main.route("/api/payment-methods/", methods=["GET"])
def get_payment_methods():
    methods = PaymentMethod.query.filter_by(is_active=True).all()
    return jsonify([{
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "account": m.account,
        "account_name": m.account_name,
        "icon": m.icon,
        "qr_image": m.qr_image,
        "min_amount": m.min_amount,
        "fee": m.fee,
        "requires_kyc": m.requires_kyc,
    } for m in methods])