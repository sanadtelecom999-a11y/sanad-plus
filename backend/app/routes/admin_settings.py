from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Setting

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    return jsonify({s.key: s.value for s in Setting.query.all()}), 200

@admin_bp.route('/settings', methods=['POST'])
@jwt_required()
def update_settings():
    for k, v in (request.json or {}).items():
        s = db.session.get(Setting, k) or Setting(key=k)
        s.value = str(v)
        db.session.add(s)
    db.session.commit()
    return jsonify({"success": True}), 200
