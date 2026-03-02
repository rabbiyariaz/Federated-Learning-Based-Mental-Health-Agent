from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import TextEntry
from typing import List


def get_user_reflections_last_7_days(db: Session, user_id: str) -> List[str]:

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    entries = (
        db.query(TextEntry)
        .filter(TextEntry.user_id == user_id)
        .filter(TextEntry.created_at >= seven_days_ago)
        .order_by(TextEntry.created_at.asc())
        .all()
    )

    return [entry.text for entry in entries]