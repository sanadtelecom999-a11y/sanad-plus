from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Category, Product, AdminActivity
from ..services.cloudinary_service import upload_base64_image

def log_action(action):
    db.session.add(AdminActivity(admin_id=1, action=action))
    db.session.commit()

@admin_bp.route('/categories', methods=['GET', 'POST'])
@jwt_required()
def handle_categories():
    if request.method == 'GET':
        cats = Category.query.filter_by(deleted_at=None).all()
        return jsonify([{"id": c.id, "name": c.name, "image": c.image, "is_active": c.is_active} for c in cats]), 200
    
    data = request.json
    image_url = upload_base64_image(data.get('image'), "sanad_categories") if data.get('image') else None
    cat = Category(name=data['name'], image=image_url)
    db.session.add(cat)
    db.session.commit()
    log_action(f"إضافة قسم جديد: {cat.name}")
    return jsonify({"success": True, "id": cat.id}), 201

@admin_bp.route('/products', methods=['GET', 'POST'])
@jwt_required()
def handle_products():
    if request.method == 'GET':
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        pagination = Product.query.filter_by(deleted_at=None).paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            "items": [{
                "id": p.id, "name": p.name, "base_price": float(p.base_price or 0),
                "base_quantity": p.base_quantity, "unit_name": p.unit_name, "image": p.image,
                "category_id": p.category_id, "category_name": p.category.name if p.category else "غير محدد",
                "is_active": p.is_active
            } for p in pagination.items],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page
        }), 200

    data = request.json
    image_url = upload_base64_image(data.get('image'), "sanad_products") if data.get('image') else None
    prod = Product(
        category_id=data['category_id'], name=data['name'], 
        base_price=data.get('base_price', 0), image=image_url
    )
    db.session.add(prod)
    db.session.commit()
    log_action(f"إضافة منتج جديد: {prod.name}")
    return jsonify({"success": True, "id": prod.id}), 201

@admin_bp.route('/activities', methods=['GET'])
@jwt_required()
def get_activities():
    acts = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(50).all()
    return jsonify([{"action": a.action, "date": a.created_at.strftime("%Y-%m-%d %H:%M")} for a in acts]), 200
