from flask import request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
import uuid, random, os
from datetime import datetime, timedelta, timezone
from ..blueprints import admin_bp
from ..extensions import db
from ..models import AdminOTPSession

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    password = data.get('password')
    if not password or password != ADMIN_PASSWORD:
        return jsonify({"error": "بيانات غير صحيحة"}), 401
    session_id = str(uuid.uuid4())
    otp_code = str(random.randint(100000, 999999))
    session = AdminOTPSession(
        session_id=session_id,
        code_hash=generate_password_hash(otp_code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.session.add(session)
    db.session.commit()
    return jsonify({"success": True, "session_id": session_id, "dev_otp": otp_code}), 200

@admin_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json or {}
    session_id = data.get('session_id')
    otp_code = data.get('otp_code')
    session = AdminOTPSession.query.filter_by(session_id=session_id).first()
    if not session:
        return jsonify({"error": "الجلسة غير موجودة"}), 400
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return jsonify({"error": "انتهت صلاحية الجلسة"}), 400
    if not check_password_hash(session.code_hash, otp_code):
        session.attempts += 1
        db.session.commit()
        return jsonify({"error": "رمز التحقق غير صحيح"}), 401
    access_token = create_access_token(identity="admin_user")
    db.session.delete(session)
    db.session.commit()
    return jsonify({"access_token": access_token}), 200
