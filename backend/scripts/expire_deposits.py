import sys, os
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app
from app.services.deposit_service import expire_old_deposits

app = create_app()
with app.app_context():
    print("Running deposit expiry task...")
    expired_count = expire_old_deposits(days=30)
    print(f"✅ Successfully expired {expired_count} pending deposits.")
