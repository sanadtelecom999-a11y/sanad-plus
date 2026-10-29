import sys
from sqlalchemy import text
from app import create_app
from app.extensions import db
def main():
    app = create_app()
    with app.app_context():
        if db.engine.dialect.name != "postgresql":
            raise RuntimeError("Not PostgreSQL")
        with db.engine.begin() as conn:
            conn.execute(text("ALTER TABLE public.kyc_requests ADD COLUMN IF NOT EXISTS id_image TEXT"))
        print("OK")
if __name__ == "__main__": main()
