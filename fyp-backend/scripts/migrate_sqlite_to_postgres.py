import argparse
import datetime as dt
import os
import shutil
from pathlib import Path
from typing import Dict, Optional, Tuple

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine, inspect, select, text
from sqlalchemy.engine import make_url


from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import TIMESTAMP


def format_row_identity(row, dst_table) -> str:
    primary_key_values = []
    for column in dst_table.primary_key.columns:
        primary_key_values.append(f"{column.name}={row.get(column.name)!r}")

    if primary_key_values:
        return ", ".join(primary_key_values)

    return ", ".join(f"{key}={value!r}" for key, value in row.items())


def parse_date_value(value, dst_table, column, row):
    if isinstance(value, dt.date) and not isinstance(value, dt.datetime):
        return value
    if not isinstance(value, str):
        row_identity = format_row_identity(row, dst_table)
        raise ValueError(
            f"Unsupported DATE value type in table '{dst_table.name}', column '{column.name}': "
            f"{value!r} ({type(value).__name__}). Row: {row_identity}"
        )
    try:
        return dt.date.fromisoformat(value)
    except ValueError as exc:
        row_identity = format_row_identity(row, dst_table)
        raise ValueError(
            f"Invalid DATE value in table '{dst_table.name}', column '{column.name}': {value!r}. "
            f"Row: {row_identity}"
        ) from exc

def fix_column_types(metadata: MetaData) -> None:
    for table in metadata.tables.values():
        for column in table.columns:
            if str(column.type) == "DATETIME":
                column.type = TIMESTAMP()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate all tables/data from SQLite to PostgreSQL safely."
    )
    parser.add_argument(
        "--sqlite-url",
        default=None,
        help="SQLite URL. Defaults to SQLITE_URL or DATABASE_URL from env.",
    )
    parser.add_argument(
        "--postgres-url",
        default=None,
        help="PostgreSQL URL. Defaults to POSTGRES_DATABASE_URL or DATABASE_URL from env.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Rows per batch insert.",
    )
    parser.add_argument(
        "--skip-backup",
        action="store_true",
        help="Skip SQLite file backup before migration.",
    )
    parser.add_argument(
        "--allow-non-empty-target",
        action="store_true",
        help="Allow writing into a non-empty PostgreSQL target.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print what would happen without writing data.",
    )
    return parser.parse_args()


def resolve_urls(args: argparse.Namespace) -> Tuple[str, str]:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    sqlite_url = (
        args.sqlite_url
        or os.getenv("SQLITE_URL")
        or (os.getenv("DATABASE_URL") if (os.getenv("DATABASE_URL") or "").startswith("sqlite") else None)
    )
    postgres_url = (
        args.postgres_url
        or os.getenv("POSTGRES_DATABASE_URL")
        or (os.getenv("DATABASE_URL") if (os.getenv("DATABASE_URL") or "").startswith("postgresql") else None)
    )

    if not sqlite_url:
        raise ValueError(
            "SQLite URL not found. Provide --sqlite-url or set SQLITE_URL / DATABASE_URL."
        )
    if not postgres_url:
        raise ValueError(
            "PostgreSQL URL not found. Provide --postgres-url or set POSTGRES_DATABASE_URL / DATABASE_URL."
        )
    if not sqlite_url.startswith("sqlite"):
        raise ValueError("Source must be SQLite (sqlite://...).")
    if not postgres_url.startswith("postgresql"):
        raise ValueError("Target must be PostgreSQL (postgresql+psycopg2://...).")

    return sqlite_url, postgres_url


def backup_sqlite(sqlite_url: str) -> Optional[Path]:
    url = make_url(sqlite_url)
    db_path = url.database
    if not db_path:
        return None

    source_path = Path(db_path)
    if not source_path.is_absolute():
        source_path = (Path(__file__).resolve().parents[1] / source_path).resolve()
    if not source_path.exists():
        return None

    backup_dir = source_path.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"{source_path.stem}_{timestamp}{source_path.suffix}.bak"
    shutil.copy2(source_path, backup_path)
    return backup_path


def ensure_target_empty(pg_engine, target_md: MetaData, allow_non_empty: bool) -> None:
    if allow_non_empty:
        return
    with pg_engine.connect() as conn:
        for table in target_md.sorted_tables:
            count = conn.execute(select(text("count(*)")).select_from(table)).scalar_one()
            if count > 0:
                raise RuntimeError(
                    f"Target table '{table.name}' is not empty ({count} rows). "
                    "Use --allow-non-empty-target only if you are sure."
                )


def table_counts(conn, metadata: MetaData) -> Dict[str, int]:
    counts = {}
    for table in metadata.sorted_tables:
        counts[table.name] = conn.execute(select(text("count(*)")).select_from(table)).scalar_one()
    return counts


def normalize_row_for_insert(row, dst_table):
    normalized = {}
    for column in dst_table.columns:
        value = row[column.name]

        if value is None:
            normalized[column.name] = None
            continue

        if isinstance(column.type, DateTime):
            if isinstance(value, dt.datetime):
                pass
            elif isinstance(value, str):
                try:
                    value = dt.datetime.fromisoformat(value)
                except ValueError as exc:
                    row_identity = format_row_identity(row, dst_table)
                    raise ValueError(
                        f"Invalid DATETIME value in table '{dst_table.name}', column '{column.name}': {value!r}. "
                        f"Row: {row_identity}"
                    ) from exc
            else:
                row_identity = format_row_identity(row, dst_table)
                raise ValueError(
                    f"Unsupported DATETIME value type in table '{dst_table.name}', column '{column.name}': "
                    f"{value!r} ({type(value).__name__}). Row: {row_identity}"
                )
            if getattr(column.type, "timezone", False) and value.tzinfo is None:
                value = value.replace(tzinfo=dt.timezone.utc)
            normalized[column.name] = value
            continue

        if str(column.type) == "DATE" and isinstance(value, str):
            normalized[column.name] = parse_date_value(value, dst_table, column, row)
            continue

        normalized[column.name] = value

    return normalized


def copy_table_data(src_conn, dst_conn, src_table, dst_table, batch_size: int) -> int:
    table_name_sql = src_conn.dialect.identifier_preparer.quote(src_table.name)
    rows = src_conn.exec_driver_sql(f"SELECT * FROM {table_name_sql}").mappings().all()
    if not rows:
        return 0

    payload = [normalize_row_for_insert(row, dst_table) for row in rows]
    inserted = 0
    for i in range(0, len(payload), batch_size):
        batch = payload[i : i + batch_size]
        dst_conn.execute(dst_table.insert(), batch)
        inserted += len(batch)
    return inserted


def reset_postgres_sequences(pg_engine, target_md: MetaData) -> None:
    preparer = pg_engine.dialect.identifier_preparer
    with pg_engine.begin() as conn:
        for table in target_md.sorted_tables:
            pk_cols = list(table.primary_key.columns)
            if len(pk_cols) != 1:
                continue

            pk_col = pk_cols[0]
            if pk_col.type.python_type is not int:
                continue

            table_name_sql = preparer.quote(table.name)
            col_name = pk_col.name
            sql = text(
                f"""
                SELECT pg_get_serial_sequence('{table_name_sql}', '{col_name}')
                """
            )
            seq_name = conn.execute(sql).scalar_one_or_none()
            if not seq_name:
                continue

            reset_sql = text(
                f"""
                SELECT setval(
                    '{seq_name}',
                    COALESCE((SELECT MAX({preparer.quote(col_name)}) FROM {table_name_sql}), 1),
                    (SELECT MAX({preparer.quote(col_name)}) IS NOT NULL FROM {table_name_sql})
                )
                """
            )
            conn.execute(reset_sql)


def migrate(sqlite_url: str, postgres_url: str, batch_size: int, allow_non_empty: bool, dry_run: bool) -> None:
    sqlite_engine = create_engine(sqlite_url)
    pg_engine = create_engine(postgres_url)

    source_md = MetaData()
    source_md.reflect(bind=sqlite_engine)
    if not source_md.tables:
        raise RuntimeError("No tables found in source SQLite database.")

    fix_column_types(source_md)

    if dry_run:
        print("[DRY RUN] Source tables:", ", ".join(source_md.tables.keys()))
        print("[DRY RUN] Would create matching tables in PostgreSQL and copy rows.")
        return

    source_md.create_all(bind=pg_engine)

    target_md = MetaData()
    target_md.reflect(bind=pg_engine, only=list(source_md.tables.keys()))

    ensure_target_empty(pg_engine, target_md, allow_non_empty)

    with sqlite_engine.connect() as src_conn, pg_engine.begin() as dst_conn:
        for src_table in source_md.sorted_tables:
            dst_table = target_md.tables[src_table.name]
            inserted = copy_table_data(src_conn, dst_conn, src_table, dst_table, batch_size)
            print(f"Copied {inserted} rows -> {src_table.name}")

    reset_postgres_sequences(pg_engine, target_md)

    with sqlite_engine.connect() as src_conn, pg_engine.connect() as dst_conn:
        src_counts = table_counts(src_conn, source_md)
        dst_counts = table_counts(dst_conn, target_md)

    mismatches = [
        name for name in src_counts.keys() if src_counts[name] != dst_counts.get(name, -1)
    ]
    if mismatches:
        details = ", ".join(
            f"{name}: sqlite={src_counts[name]} postgres={dst_counts.get(name, 0)}"
            for name in mismatches
        )
        raise RuntimeError(f"Row-count validation failed: {details}")

    print("Migration completed successfully. Row counts match for all tables.")


def main() -> None:
    args = parse_args()
    sqlite_url, postgres_url = resolve_urls(args)

    if not args.skip_backup:
        backup_path = backup_sqlite(sqlite_url)
        if backup_path:
            print(f"SQLite backup created: {backup_path}")
        else:
            print("SQLite backup skipped (file not found or not file-based SQLite).")

    print("Source:", sqlite_url)
    print("Target:", postgres_url)
    migrate(
        sqlite_url=sqlite_url,
        postgres_url=postgres_url,
        batch_size=args.batch_size,
        allow_non_empty=args.allow_non_empty_target,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
