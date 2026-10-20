"""Support Ticketing Routes"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import SupportTicket
from ..services.telegram_service import send_telegram_notification
from . import main
from flask_jwt_extended import jwt_required, get_jwt_identity
import os

@main.route('/api/support', methods=['POST'])
@jwt_required()
def create_ticket():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({"error": "الرسالة لا يمكن أن تكون فارغة"}), 400
        
    ticket = SupportTicket(user_id=user_id, message=message)
    db.session.add(ticket)
    db.session.commit()
    
    # إرسال إشعار للأدمن
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    if admin_ids:
        msg = f"🎫 **تذكرة دعم جديدة #{ticket.id}**\n\nالمستخدم: {user_id}\nالرسالة: {message}"
        send_telegram_notification(admin_ids[0], msg)
        
    return jsonify({"status": "ok", "ticket_id": ticket.id}), 201

@main.route('/api/support', methods=['GET'])
@jwt_required()
def get_tickets():
    user_id = int(get_jwt_identity())
    tickets = SupportTicket.query.filter_by(user_id=user_id).order_by(SupportTicket.created_at.desc()).all()
    
    return jsonify([{
        "id": t.id,
        "message": t.message,
        "status": t.status,
        "reply": t.admin_reply,
        "date": t.created_at.isoformat()
    } for t in tickets]), 200
