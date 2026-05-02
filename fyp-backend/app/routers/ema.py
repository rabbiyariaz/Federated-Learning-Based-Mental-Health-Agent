from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date, timedelta, datetime
from app.database import get_db
from app.models import EMAEntry
from app.schemas import EMACreate
from app.auth import verify_token



REQUIRED_KEYS = {"1", "2", "3", "4", "5_severity", "5_type", "6"}

NUMERIC_KEYS = ["1", "2", "3", "4", "5_severity", "6"]

VALID_TYPES = {
    "My mind was frequently occupied by racing or negative thoughts",
    "I felt restless or found it difficult to sit still"
}
router = APIRouter(prefix="/ema")


@router.get("/today-status")
def get_today_status(
    check_date: str = None,  # Optional: client can send their local date
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Use client's date if provided, otherwise use server's local date
    if check_date:
        try:
            # Parse the date string from client (format: YYYY-MM-DD)
            today = datetime.strptime(check_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            today = date.today()
    else:
        today = date.today()
    
    already_submitted = (
        db.query(EMAEntry)
        .filter(EMAEntry.user_id == session_id, EMAEntry.date_submitted == today)
        .first()
        is not None
    )

    return {
        "date": today,
        "submitted": already_submitted,
    }

@router.post("")
def submit_ema(payload: EMACreate,
               session_id: str = Depends(verify_token),
               db: Session = Depends(get_db)):

    # 1️⃣ Validate study window
    if payload.date_submitted < date.today() - timedelta(days=30):
        raise HTTPException(status_code=400, detail="Invalid EMA date")
    
    # Allow submissions up to tomorrow (to handle timezone differences)
    if payload.date_submitted > date.today() + timedelta(days=1):
        raise HTTPException(
        status_code=400,
        detail="Future dates are not allowed"
    )

    responses = payload.responses

    # 2️⃣ Check required fields
    if not REQUIRED_KEYS.issubset(responses.keys()):
        raise HTTPException(
            status_code=400,
            detail="Missing required EMA fields"
        )

    # 3️⃣ Validate numeric ranges (0–4)
    for key in NUMERIC_KEYS:
        value = responses.get(key)

        if not isinstance(value, int) or not (0 <= value <= 4):
            raise HTTPException(
                status_code=400,
                detail=f"{key} must be an integer between 0 and 4"
            )

    # 4️⃣ Validate 5_type
    if responses["5_type"] not in VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid 5_type value"
        )

    # 5️⃣ Pre-check: Prevent duplicate submissions
    existing = (
        db.query(EMAEntry)
        .filter(EMAEntry.user_id == session_id, EMAEntry.date_submitted == payload.date_submitted)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="EMA already submitted for this date. You can submit again tomorrow."
        )

    # 6️⃣ Create DB record
    record = EMAEntry(
        user_id=session_id, 
        date_submitted=payload.date_submitted,
        responses=responses
    )

    try:
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="EMA already submitted for this date. You can submit again tomorrow."
        )

    return {
        "status": "ok",
        "date": payload.date_submitted
    }