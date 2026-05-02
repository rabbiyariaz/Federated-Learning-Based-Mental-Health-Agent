from app.database import engine, Base
from app import models
from sqlalchemy import inspect, text

print("🚀 init_db.py started")

def init_db():
    print("📦 Creating tables...")
    Base.metadata.create_all(bind=engine)
    ensure_session_recovery_columns()
    print("✅ create_all() finished")


def ensure_session_recovery_columns(bind=engine):
    inspector = inspect(bind)
    if "sessions" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("sessions")}
    required_columns = []

    if "recovery_code_hash" not in existing_columns:
        required_columns.append("ALTER TABLE sessions ADD COLUMN recovery_code_hash VARCHAR")
    
    if not required_columns:
        return

    with bind.begin() as conn:
        for statement in required_columns:
            conn.execute(text(statement))

if __name__ == "__main__":
    init_db()
    print("🎉 Database tables created")
