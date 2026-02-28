from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import EMAEntry, PHQAssessment
from app.services.analysis_service import compute_ema_summary
from app.database import get_db
from app.auth import verify_token

router = APIRouter(prefix="/report")


@router.get("")
def generate_report(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # 1️⃣ Get PHQs ordered newest first
    phqs = (
        db.query(PHQAssessment)
        .filter(PHQAssessment.user_id == session_id)
        .order_by(PHQAssessment.submitted_at.desc())
        .all()
    )

    if not phqs:
        raise HTTPException(404, "No PHQ data found")

    latest_phq = phqs[0]

    # 2️⃣ Define 7-day EMA window before latest PHQ
    end_date = latest_phq.submitted_at.date()
    start_date = end_date - timedelta(days=7)

    ema_entries = (
        db.query(EMAEntry)
        .filter(
            EMAEntry.user_id == session_id,
            EMAEntry.date_submitted >= start_date,
            EMAEntry.date_submitted <= end_date
        )
        .order_by(EMAEntry.date_submitted)
        .all()
    )

    ema_summary = compute_ema_summary(ema_entries)

    # 3️⃣ PHQ Progress (only if ≥7 days apart)
    phq_progress = None

    if len(phqs) >= 2:
        previous_phq = phqs[1]
        gap_days = (latest_phq.submitted_at - previous_phq.submitted_at).days

        if gap_days >= 7:
            delta = latest_phq.total_score - previous_phq.total_score

            if delta <= -5:
                status = "Significant improvement"
            elif delta >= 5:
                status = "Significant worsening"
            else:
                status = "No major change"

            phq_progress = {
                "previous_score": previous_phq.total_score,
                "current_score": latest_phq.total_score,
                "change": delta,
                "status": status,
                "days_between": gap_days
            }




            
    

    return {
        "latest_phq": {
            "score": latest_phq.total_score,
            "submittedAt": latest_phq.submitted_at.isoformat()
        },
        "phq_progress": phq_progress,
        "ema_summary": ema_summary,
        "ema_days_completed": len(ema_entries),

        "phq_list": [
    {
        "score": p.total_score,
        "submittedAt": p.submitted_at.isoformat()
    }
    for p in phqs
]
    }