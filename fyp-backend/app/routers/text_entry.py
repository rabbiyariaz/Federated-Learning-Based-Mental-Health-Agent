from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import TextEntry
from app.schemas import TextEntryCreate, TextEntryResponse
from app.database import get_db
from app.auth import verify_token
from typing import List

router = APIRouter(prefix="/text-entries", tags=["Text Entries"])


@router.post("", response_model=TextEntryResponse, status_code=201)
def create_text_entry(
    entry: TextEntryCreate,
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Submit a text reflection/journal entry.
    
    These entries are used for weekly risk assessment using the LSTM aggregator.
    Minimum 3 entries in 7 days required for weekly analysis.
    """
    if not entry.text or not entry.text.strip():
        raise HTTPException(status_code=400, detail="Text entry cannot be empty")
    
    db_entry = TextEntry(
        user_id=session_id,
        text=entry.text.strip()
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry


@router.get("", response_model=List[TextEntryResponse])
def get_text_entries(
    limit: int = 10,
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get user's text entries, ordered by newest first.
    """
    entries = (
        db.query(TextEntry)
        .filter(TextEntry.user_id == session_id)
        .order_by(TextEntry.created_at.desc())
        .limit(limit)
        .all()
    )
    
    return entries


@router.get("/count")
def get_text_entry_count(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get the total count of text entries and count from last 7 days.
    """
    from datetime import datetime, timedelta, timezone
    
    total_count = (
        db.query(TextEntry)
        .filter(TextEntry.user_id == session_id)
        .count()
    )
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    weekly_count = (
        db.query(TextEntry)
        .filter(
            TextEntry.user_id == session_id,
            TextEntry.created_at >= seven_days_ago
        )
        .count()
    )
    
    return {
        "total": total_count,
        "last_7_days": weekly_count,
        "weekly_analysis_ready": weekly_count >= 3
    }
