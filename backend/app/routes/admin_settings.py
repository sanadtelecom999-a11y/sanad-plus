from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Setting

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    settings = Setting.query.all()
    return jsonify({s.key: s.value for s in settings}), 200

@admin_bp.route('/settings', methods=['POST'])
@jwt_required()
def update_settings():
    data = request.json or {}
    for key, value in data.items():
        setting = db.session.get(Setting, key)
        if setting:
            setting.value = str(value)
        else:
            db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()
    return jsonify({"success": True}), 200
