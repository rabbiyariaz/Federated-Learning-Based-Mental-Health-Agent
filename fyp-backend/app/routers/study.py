from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict

from app.database import SessionLocal
from app.models import PHQAssessment, EMAEntry

router = APIRouter(prefix="/api/study", tags=["Study"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_phq_by_user(user_id: str, db: Session):
    """Get all PHQ assessments for a user from database"""
    try:
        phq_entries = (
            db.query(PHQAssessment)
            .filter(PHQAssessment.user_id == user_id)
            .order_by(PHQAssessment.study_day)
            .all()
        )
        
        return [
            {
                "studyDay": entry.study_day,
                "totalScore": entry.total_score,
                "submittedAt": entry.submitted_at.isoformat() if entry.submitted_at else None
            }
            for entry in phq_entries
        ]
    except Exception as e:
        print(f"Error in get_phq_by_user: {e}")
        return []


def get_ema_by_user(user_id: str, db: Session):
    """Get all EMA entries for a user from database"""
    try:
        ema_entries = (
            db.query(EMAEntry)
            .filter(EMAEntry.user_id == user_id)
            .order_by(EMAEntry.date_submitted)
            .all()
        )
        
        ema_data = []
        for idx, entry in enumerate(ema_entries):
            # Calculate study day (starting from day 1)
            study_day = idx + 1
            
            ema_data.append({
                "studyDay": study_day,
                "date": entry.date_submitted.isoformat() if entry.date_submitted else None,
                "responses": entry.responses or {},
                "submittedAt": entry.submitted_at.isoformat() if entry.submitted_at else None
            })
        
        return ema_data
    except Exception as e:
        print(f"Error in get_ema_by_user: {e}")
        return []


def get_study_duration(user_id: str, db: Session):
    """Get study duration (default 14 days)"""
    # Could be extended to calculate based on PHQ assessments (e.g., days 0 and 14)
    return 14


@router.get("/{user_id}/summary")
def get_dashboard_summary(user_id: str, db: Session = Depends(get_db)):
    """
    Consolidated endpoint for dashboard visualization
    Fetches real data from database
    """

    phq = get_phq_by_user(user_id, db)
    ema = get_ema_by_user(user_id, db)
    study_duration = get_study_duration(user_id, db)

    if not phq and not ema:
        raise HTTPException(status_code=404, detail="No data found for user")

    return {
        "phq": phq,
        "ema": ema,
        "studyDuration": study_duration
    }
