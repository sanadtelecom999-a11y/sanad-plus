from flask import Blueprint

main = Blueprint("main", __name__)

# استيراد المسارات لتسجيلها مع الـ Blueprint
from . import auth, user, categories, products, orders, deposits, payment_methods, admin
from . import coupons, referrals, settings_public