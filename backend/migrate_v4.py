import sys
from sqlalchemy import text
from app import create_app
from app.extensions import db
def main():
    app = create_app()
    with app.app_context():
        with db.engine.begin() as conn:
            conn.execute(text("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note TEXT"))
        print("OK")
if __name__ == "__main__": main()