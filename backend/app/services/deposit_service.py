from datetime import datetime, timedelta
from app.extensions import db
from app.models.base import Deposit

def expire_old_deposits(days=30) -> int:
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    old_deposits = Deposit.query.filter(
        Deposit.status == 'pending',
        Deposit.created_at < cutoff_date
    ).all()
    
    count = 0
    for deposit in old_deposits:
        deposit.status = 'expired'
        count += 1
        
    if count > 0:
        db.session.commit()
        
    return count
