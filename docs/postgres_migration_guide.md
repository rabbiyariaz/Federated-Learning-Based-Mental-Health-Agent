# SQLite to PostgreSQL Migration Guide

This project currently runs with SQLAlchemy and can use either SQLite or PostgreSQL through `DATABASE_URL`.

## 1) Install backend dependencies

From `fyp-backend/`:

```bash
pip install -r requirements.txt
```

## 2) Prepare PostgreSQL database

Create an empty database (example name: `fyp_db`) and a user with access.

Example SQL:

```sql
CREATE DATABASE fyp_db;
```

## 3) Keep current SQLite as source and set PostgreSQL as target

In `fyp-backend/.env`, set:

```env
SQLITE_URL=sqlite:///./data/app.db
POSTGRES_DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/fyp_db
```

Keep your existing `DATABASE_URL` unchanged until migration is verified.

## 4) Run migration script (safe mode)

From `fyp-backend/`:

```bash
python scripts/migrate_sqlite_to_postgres.py
```

What it does:
- Creates a timestamped backup of your SQLite file in `data/backups/`
- Creates matching tables in PostgreSQL
- Copies all rows table-by-table
- Resets PostgreSQL sequences
- Validates row counts between source and target

## 5) Dry run option

```bash
python scripts/migrate_sqlite_to_postgres.py --dry-run
```

## 6) Switch application to PostgreSQL

After successful migration, update `fyp-backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/fyp_db
```

You can keep `SQLITE_URL` for rollback safety.

## 7) Verify app startup

```bash
python -m app.init_db
uvicorn app.main:app --reload
```

If needed, rollback by restoring `DATABASE_URL` to the SQLite value.
