from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import EMAEntry, PHQAssessment
from app.services.analysis_service import compute_ema_summary

router = APIRouter(prefix="/report")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/{user_id}")
def generate_report(user_id: str, db: Session = Depends(get_db)):

    ema_entries = (
    db.query(EMAEntry)
    .filter(EMAEntry.user_id == user_id)
    .order_by(EMAEntry.date_submitted.desc())
    .limit(7)
    .all()
)
    ema_entries.reverse()

    phq_entries = (
        db.query(PHQAssessment)
        .filter(PHQAssessment.user_id == user_id)
        .order_by(PHQAssessment.study_day)
        .all()
    )

    if not phq_entries:
        raise HTTPException(404, "No PHQ data found for this user")

    ema_summary = compute_ema_summary(ema_entries)

    return {
        "user_id": user_id,
        "phq": [
            {
                "studyDay": p.study_day,
                "totalScore": p.total_score,
                "submittedAt": p.submitted_at.isoformat() if p.submitted_at else None
            }
            for p in phq_entries
        ],
        "ema_summary": ema_summary,
        "ema_days_completed": len(ema_entries),
        "study_duration_days": 14
    }
