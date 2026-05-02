from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import EMAEntry, PHQAssessment
from app.services.analysis_service import compute_ema_summary, compute_phq_trend
from app.database import get_db
from app.auth import verify_token
from ml.daic_model import DAICModel
from ml.ml_services.weekly_report_service import WeeklyReportService

router = APIRouter(prefix="/report")

# Initialize services (lazy loading)
_weekly_service = None

_EMPTY_PHQ_MESSAGE = (
    "No PHQ data found yet. Complete a PHQ assessment to generate your report."
)


def get_weekly_service():
    """Lazy-load the weekly report service"""
    global _weekly_service
    if _weekly_service is None:
        daic_model = DAICModel()
        daic_model.load()
        _weekly_service = WeeklyReportService(daic_model)
    return _weekly_service


@router.get("")
def generate_report(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    # 1️⃣ Get PHQs ordered newest first
    phqs = (
        db.query(PHQAssessment)
        .filter(PHQAssessment.user_id == session_id)
        .order_by(PHQAssessment.submitted_at.desc())
        .all()
    )

    if not phqs:
        return {
            "hasData": False,
            "message": _EMPTY_PHQ_MESSAGE,
            "latest_phq": None,
            "phq_history": [],
            "phq_list": [],
            "phq_progress": None,
            "phq_trend": None,
            "ema_summary": None,
            "ema_days_completed": 0,
            "text_risk": None,
        }

    latest_phq = phqs[0]

    # 2️⃣ Define 7-day EMA window before latest PHQ
    end_date = latest_phq.submitted_at.date()
    start_date = end_date - timedelta(days=7)

    ema_entries = (
        db.query(EMAEntry)
        .filter(
            EMAEntry.user_id == session_id,
            EMAEntry.date_submitted >= start_date,
            EMAEntry.date_submitted <= end_date,
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
                "days_between": gap_days,
            }

    # 4️⃣ PHQ Trend Analysis (across all valid PHQs ≥7 days apart)
    phq_trend = compute_phq_trend(phqs)
    print(len(ema_entries))

    phq_list = [
        {"score": p.total_score, "submittedAt": p.submitted_at.isoformat()}
        for p in phqs
    ]

    return {
        "hasData": True,
        "latest_phq": {
            "score": latest_phq.total_score,
            "submittedAt": latest_phq.submitted_at.isoformat(),
        },
        "phq_progress": phq_progress,
        "phq_trend": phq_trend,
        "ema_summary": ema_summary,
        "ema_days_completed": len(ema_entries),
        "phq_list": phq_list,
    }


@router.get("/weekly-text-risk")
def get_weekly_text_risk(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get weekly text risk assessment using LSTM aggregator.

    Analyzes the user's text reflections from the last 7 days and returns
    one of three risk levels: Low, Moderate, or Elevated.

    Returns:
        - weekly_risk_level: One of ["Low", "Moderate", "Elevated", "Insufficient Data", "No Data"]
        - reflection_count: Number of reflections analyzed
        - message: Descriptive message about the analysis
    """
    weekly_service = get_weekly_service()

    try:
        result = weekly_service.generate_for_user(db, session_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating weekly text risk report: {str(e)}",
        )
