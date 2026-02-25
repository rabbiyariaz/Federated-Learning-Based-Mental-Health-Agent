from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date

from app.database import SessionLocal
from app.models import EMAEntry
from app.schemas import EMACreate
from datetime import timedelta

router = APIRouter(prefix="/ema")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
def submit_ema(payload: EMACreate, db: Session = Depends(get_db)):

    # Optional guard: block EMA outside study window (soft rule)
    if payload.date_submitted < date.today() - timedelta(days=30):
        raise HTTPException(400, "Invalid EMA date")

    record = EMAEntry(
        user_id=payload.user_id,
        date_submitted=payload.date_submitted,
        responses=payload.responses
    )

    try:
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="EMA already submitted for this date"
        )

    return {
        "status": "ok",
        "user_id": payload.user_id,
        "date": payload.date_submitted
    }
