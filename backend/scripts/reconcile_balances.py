"""يتحقق أن user.balance == SUM(financial_ledger.amount)."""
from decimal import Decimal
from app import create_app
from app.extensions import db
from app.models import User, FinancialLedger
from sqlalchemy import func

def reconcile():
    app = create_app()
    with app.app_context():
        discrepancies = []
        users = db.session.query(User).all()
        for user in users:
            ledger_sum = db.session.query(
                func.coalesce(func.sum(FinancialLedger.amount), 0)
            ).filter_by(user_id=user.id).scalar()
            expected = Decimal(str(ledger_sum))
            current = Decimal(str(user.balance or 0))
            if current != expected:
                discrepancies.append({
                    "user_id": user.id,
                    "telegram_id": user.telegram_id,
                    "balance": str(current),
                    "ledger": str(expected),
                    "diff": str(current - expected),
                })
        if not discrepancies:
            print(f"PASSED: {len(users)} users reconciled")
            return 0
        print(f"FAILED: {len(discrepancies)} discrepancies")
        for d in discrepancies:
            print(f"  user={d['user_id']} tg={d['telegram_id']} bal={d['balance']} ledger={d['ledger']} diff={d['diff']}")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(reconcile())
