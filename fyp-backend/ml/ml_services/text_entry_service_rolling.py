from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import TextEntry
from typing import List


def get_user_reflections_rolling_window(db: Session, user_id: str, days: int = 30) -> List[str]:
    """
    Get user reflections over a rolling window (e.g., 30 days).
    
    This accumulates more utterances for LSTM processing:
    - 30 days × ~1 reflection/day = ~30 utterances
    - 30 days × 3 reflections/day = ~90 utterances (LSTM optimal range)
    
    Args:
        db: Database session
        user_id: User session ID
        days: Rolling window size (default 30 days)
        
    Returns:
        List of reflection texts ordered chronologically
    """
    window_start = datetime.now(timezone.utc) - timedelta(days=days)

    entries = (
        db.query(TextEntry)
        .filter(TextEntry.user_id == user_id)
        .filter(TextEntry.created_at >= window_start)
        .order_by(TextEntry.created_at.asc())
        .all()
    )

    return [entry.text for entry in entries]


def get_user_reflections_last_n(db: Session, user_id: str, n: int = 50) -> List[str]:
    """
    Get the last N reflections regardless of time window.
    
    Useful when you want a fixed sequence length for LSTM:
    - n=50: Good for moderate sequences
    - n=80-120: Optimal for DAIC-WOZ LSTM
    
    Args:
        db: Database session
        user_id: User session ID
        n: Number of reflections to retrieve
        
    Returns:
        List of reflection texts ordered chronologically (oldest to newest)
    """
    entries = (
        db.query(TextEntry)
        .filter(TextEntry.user_id == user_id)
        .order_by(TextEntry.created_at.desc())
        .limit(n)
        .all()
    )
    
    # Reverse to get chronological order (oldest first)
    entries = list(reversed(entries))

    return [entry.text for entry in entries]
