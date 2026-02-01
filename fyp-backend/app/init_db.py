from app.database import engine, Base
from app import models

print("🚀 init_db.py started")

def init_db():
    print("📦 Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ create_all() finished")

if __name__ == "__main__":
    init_db()
    print("🎉 Database tables created")
