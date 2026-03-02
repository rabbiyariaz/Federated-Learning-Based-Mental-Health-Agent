from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, StaticPool
from app.config import DATABASE_URL

# SQLite needs special args, PostgreSQL does not
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {
        "check_same_thread": False,
        "timeout": 60  # Increased timeout to 60 seconds
    }
    # Use StaticPool for single connection - better for SQLite concurrency
    engine_args["poolclass"] = StaticPool
    engine_args["pool_pre_ping"] = True  # Verify connections before using
    
    engine = create_engine(
        DATABASE_URL,
        **engine_args
    )
    
    # Enable WAL mode for better concurrency
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_con, connection_record):
        cursor = dbapi_con.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=60000")  # 60 second busy timeout
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        **engine_args
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
