from flask import request, jsonify, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
import uuid, random
from datetime import datetime, timedelta, timezone
from ..blueprints import admin_bp
from ..extensions import db
from ..models import AdminOTPSession

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    password = data.get('password')
    expected = current_app.config.get('ADMIN_PASSWORD', 'admin123')
    
    # طباعة بسيطة جداً للتشخيص
    print(f"LOGIN_ATTEMPT: Received='{password}' | Expected='{expected}'", flush=True)

    if not password or password != expected:
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
    
    print(f"\n[OTP] {otp_code}\n", flush=True)
    return jsonify({"success": True, "session_id": session_id}), 200

@admin_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json or {}
    session = AdminOTPSession.query.filter_by(session_id=data.get('session_id')).first()
    if not session: return jsonify({"error": "الجلسة غير موجودة"}), 400
    expires = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    if expires < datetime.now(timezone.utc): return jsonify({"error": "انتهت الجلسة"}), 400
    if not check_password_hash(session.code_hash, data.get('otp_code')):
        return jsonify({"error": "رمز خاطئ"}), 401
    token = create_access_token(identity="admin_user")
    db.session.delete(session)
    db.session.commit()
    return jsonify({"access_token": token}), 200
