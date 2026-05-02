from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models import PHQAssessment, EMAEntry
from app.services.analysis_service import compute_ema_summary
from app.auth import verify_token

router = APIRouter(prefix="/api/study", tags=["Study"])

_EMPTY_STUDY_MESSAGE = (
    "No study data found yet. Complete a PHQ assessment or daily check-in to see your progress."
)


@router.get("/summary")
def get_dashboard_summary(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    phq_entries = (
        db.query(PHQAssessment)
        .filter(PHQAssessment.user_id == session_id)
        .order_by(PHQAssessment.submitted_at)
        .all()
    )

    ema_entries = (
        db.query(EMAEntry)
        .filter(
            EMAEntry.user_id == session_id,
            EMAEntry.date_submitted <= date.today(),
        )
        .order_by(EMAEntry.date_submitted)
        .all()
    )

    if not phq_entries and not ema_entries:
        return {
            "hasData": False,
            "message": _EMPTY_STUDY_MESSAGE,
            "phq": [],
            "ema": [],
            "latest_phq": None,
            "latest_ema": None,
            "summary": {
                "phq_count": 0,
                "ema_count": 0,
                "average_mood": None,
                "average_energy": None,
                "average_sleep": None,
            },
        }

    ema_summary = compute_ema_summary(ema_entries)

    return {
        "hasData": True,
        "phq": [
            {
                "totalScore": p.total_score,
                "submittedAt": p.submitted_at.isoformat(),
            }
            for p in phq_entries
        ],
        "ema": [
            {
                "date": e.date_submitted.isoformat(),
                "responses": e.responses,
                "submittedAt": e.submitted_at.isoformat(),
            }
            for e in ema_entries
        ],
        "ema_summary": ema_summary,
    }
