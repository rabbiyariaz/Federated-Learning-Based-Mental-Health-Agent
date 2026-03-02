import os
from dotenv import load_dotenv
from pathlib import Path

# Resolve backend root
BACKEND_DIR = Path(__file__).resolve().parents[1]

# Load .env
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")

if DATABASE_URL.startswith("sqlite:///"):
    sqlite_path = DATABASE_URL.replace("sqlite:///", "", 1)
    if sqlite_path.startswith("./"):
        absolute_sqlite_path = (BACKEND_DIR / sqlite_path[2:]).resolve()
        DATABASE_URL = f"sqlite:///{absolute_sqlite_path.as_posix()}"

ENV = os.getenv("ENV", "development")
