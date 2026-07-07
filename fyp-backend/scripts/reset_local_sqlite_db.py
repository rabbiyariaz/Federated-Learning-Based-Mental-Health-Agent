# """
# Local development only. Do not use on production databases.

# Resets fyp-backend/app.db to match the current SQLAlchemy models (e.g. after
# Session schema changes). Backs up the existing file, deletes it, then recreates
# all tables with Base.metadata.create_all.

# Run manually from fyp-backend (or with PYTHONPATH set to fyp-backend):

#     cd fyp-backend
#     python scripts/reset_local_sqlite_db.py

# This script only touches the file fyp-backend/app.db (and a new backup next to it).
# It does not modify .env or application source code.
# """

# from __future__ import annotations

# import os
# import shutil
# import sys
# from datetime import datetime
# from pathlib import Path

# BACKEND_ROOT = Path(__file__).resolve().parents[1]
# APP_DB = (BACKEND_ROOT / "app.db").resolve()


# def main() -> None:
#     sys.path.insert(0, str(BACKEND_ROOT))

#     # Force SQLite against app.db so this script never touches DATABASE_URL from .env
#     # (e.g. PostgreSQL) when creating metadata — only the local app.db file is affected.
#     os.environ["DATABASE_URL"] = f"sqlite:///{APP_DB.as_posix()}"

#     if APP_DB.exists():
#         ts = datetime.now().strftime("%Y%m%d_%H%M%S")
#         backup_path = BACKEND_ROOT / f"app_backup_{ts}.db"
#         shutil.copy2(APP_DB, backup_path)
#         print(f"Backed up existing database to: {backup_path}")
#         APP_DB.unlink()
#         print(f"Deleted old database file: {APP_DB}")
#     else:
#         print(f"No existing database at {APP_DB} — skipping backup and delete.")

#     from app.database import Base, engine  # noqa: E402

#     import app.models  # noqa: F401, E402 — register models on Base.metadata

#     Base.metadata.create_all(bind=engine)
#     print(f"Created new database with current schema: {APP_DB}")


# if __name__ == "__main__":
#     main()
