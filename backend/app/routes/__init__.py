from flask import Blueprint

main = Blueprint("main", __name__)

# استيراد المسارات لتسجيلها مع الـ Blueprint
from . import auth, user, categories, products, orders, deposits, payment_methods, admin
from . import coupons, referrals, settings_public
from . import admin_kyc
from . import admin_deposits
from . import admin_users
from . import admin_products
from . import admin_settings
from . import admin_archive
from . import webhooks
