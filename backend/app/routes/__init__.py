from flask import Blueprint

main = Blueprint("main", __name__)

from . import auth, user, categories, products, orders, deposits, payment_methods, admin