from flask import request, jsonify
from ..extensions import db
from ..models.base import SupportTicket, SupportMessage, User
from ..services.telegram_service import send_telegram_notification
from . import main
from .admin_utils import is_admin_user, handle_errors
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
import os

# ================= User Routes =================
@main.route('/api/support', methods=['POST'])
@jwt_required()
def send_support_message():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    message = data.get('message', '').strip()
    
    if not message: return jsonify({"error": "الرسالة فارغة"}), 400

    # البحث عن تذكرة مفتوحة
    ticket = SupportTicket.query.filter_by(user_id=user_id, status='open').first()
    
    # إذا لم توجد تذكرة مفتوحة، نتحقق إذا كان هناك تذكرة مغلقة حديثاً (أقل من ساعة)
    if not ticket:
        last_closed = SupportTicket.query.filter_by(user_id=user_id, status='closed').order_by(SupportTicket.updated_at.desc()).first()
        if last_closed:
            time_diff = datetime.now(timezone.utc) - last_closed.updated_at.replace(tzinfo=timezone.utc)
            if time_diff.total_seconds() < 3600:
                return jsonify({"error": "المحادثة مغلقة. يرجى الانتظار حتى انتهاء الوقت لفتح تذكرة جديدة."}), 403
        
        # إنشاء تذكرة جديدة
        ticket = SupportTicket(user_id=user_id, status='open')
        db.session.add(ticket)
        db.session.commit()
        
        admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
        if admin_ids:
            send_telegram_notification(admin_ids[0], f"🎫 تذكرة دعم جديدة من المستخدم #{user_id}")
    
    new_msg = SupportMessage(ticket_id=ticket.id, sender_type='user', message=message)
    ticket.updated_at = datetime.now(timezone.utc)
    db.session.add(new_msg)
    db.session.commit()
    
    return jsonify({"status": "ok", "message_id": new_msg.id}), 201

@main.route('/api/support', methods=['GET'])
@jwt_required()
def get_support_messages():
    user_id = int(get_jwt_identity())
    
    # 1. البحث عن تذكرة مفتوحة
    ticket = SupportTicket.query.filter_by(user_id=user_id, status='open').first()
    is_closed = False
    
    # 2. إذا لم توجد، نبحث عن آخر تذكرة مغلقة
    if not ticket:
        ticket = SupportTicket.query.filter_by(user_id=user_id, status='closed').order_by(SupportTicket.updated_at.desc()).first()
        if ticket:
            # التحقق من مرور ساعة
            time_diff = datetime.now(timezone.utc) - ticket.updated_at.replace(tzinfo=timezone.utc)
            if time_diff.total_seconds() >= 3600:
                ticket = None # اختفت التذكرة
            else:
                is_closed = True
    
    if not ticket:
        return jsonify({"ticket_id": None, "messages": [], "is_closed": False}), 200
        
    messages = [{
        "id": m.id, "sender_type": m.sender_type, "message": m.message, "created_at": m.created_at.isoformat()
    } for m in ticket.messages]
    
    return jsonify({"ticket_id": ticket.id, "messages": messages, "is_closed": is_closed}), 200

# ================= Admin Routes =================
@main.route('/admin/api/support/tickets', methods=['GET'])
@jwt_required()
@handle_errors
def admin_get_tickets():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    
    status = request.args.get('status', 'open')
    if status not in ['open', 'closed']:
        status = 'open'

    tickets = SupportTicket.query.filter_by(status=status).order_by(SupportTicket.updated_at.desc()).all()
    result = []
    for t in tickets:
        user = User.query.get(t.user_id)
        last_msg = t.messages[-1] if t.messages else None
        result.append({
            "id": t.id, "user_name": user.first_name if user else "مستخدم", "user_telegram": user.telegram_id if user else "",
            "last_message": last_msg.message if last_msg else "", "updated_at": t.updated_at.isoformat() if t.updated_at else t.created_at.isoformat(),
            "status": t.status
        })
    return jsonify(result)

@main.route('/admin/api/support/tickets/<int:id>', methods=['GET'])
@jwt_required()
@handle_errors
def admin_get_ticket_messages(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    ticket = SupportTicket.query.get(id)
    if not ticket: return jsonify({"error": "التذكرة غير موجودة"}), 404
    messages = [{"id": m.id, "sender_type": m.sender_type, "message": m.message, "created_at": m.created_at.isoformat()} for m in ticket.messages]
    return jsonify({"ticket_id": ticket.id, "messages": messages})

@main.route('/admin/api/support/tickets/<int:id>/reply', methods=['POST'])
@jwt_required()
@handle_errors
def admin_reply_ticket(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json()
    reply = data.get('reply', '').strip()
    if not reply: return jsonify({"error": "الرد مطلوب"}), 400
    
    ticket = SupportTicket.query.get(id)
    if not ticket or ticket.status == 'closed': return jsonify({"error": "التذكرة مغلقة"}), 404
    
    new_msg = SupportMessage(ticket_id=ticket.id, sender_type='admin', message=reply)
    ticket.updated_at = datetime.now(timezone.utc)
    db.session.add(new_msg)
    db.session.commit()
    return jsonify({"success": True})

@main.route('/admin/api/support/tickets/<int:id>/close', methods=['POST'])
@jwt_required()
@handle_errors
def admin_close_ticket(id):
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    ticket = SupportTicket.query.get(id)
    if not ticket: return jsonify({"error": "التذكرة غير موجودة"}), 404
    
    ticket.status = 'closed'
    ticket.updated_at = datetime.now(timezone.utc)
    
    # إضافة رسالة النظام
    sys_msg = SupportMessage(
        ticket_id=ticket.id, 
        sender_type='system', 
        message="تم إنهاء المحادثة. شكراً لتواصلك مع سند بلس، نتمنى لك يوماً سعيداً! ✨"
    )
    db.session.add(sys_msg)
    db.session.commit()
    
    return jsonify({"success": True})


@admin_bp.route('/start-chat', methods=['POST'])
def start_admin_chat():
    from flask import request, jsonify
    from ..models import db, User
    from ..models.support import SupportTicket, SupportMessage
    from ..utils.security import admin_required
    
    @admin_required
    def _inner():
        data = request.json
        user_id = data.get('user_id')
        message = data.get('message')
        user = User.query.get(user_id)
        if not user: return jsonify({"error": "User not found"}), 404
        
        ticket = SupportTicket.query.filter_by(user_id=user_id, status='open').first()
        if not ticket:
            ticket = SupportTicket(user_id=user_id, status='open')
            db.session.add(ticket)
            db.session.commit()
            
        msg = SupportMessage(ticket_id=ticket.id, sender_type='admin', message=message)
        db.session.add(msg)
        db.session.commit()
        return jsonify({"success": True, "ticket_id": ticket.id}), 200
    return _inner()
