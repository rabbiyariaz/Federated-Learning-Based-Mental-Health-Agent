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

ENV = os.getenv("ENV", "development")
