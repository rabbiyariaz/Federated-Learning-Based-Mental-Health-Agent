from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app.models import PHQAssessment
from app.schemas import PHQCreate

router = APIRouter(prefix="/phq")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
def submit_phq(payload: PHQCreate, db: Session = Depends(get_db)):

    # 1️⃣ Validate study day
    if payload.study_day not in [0, 14]:
        raise HTTPException(400, "Invalid study day")

    # 2️⃣ Validate PHQ-8 responses
    if len(payload.responses) != 8:
        raise HTTPException(400, "PHQ-8 requires exactly 8 responses")

    if any(v not in [0, 1, 2, 3] for v in payload.responses.values()):
        raise HTTPException(400, "PHQ responses must be between 0 and 3")

    # 3️⃣ Backend-controlled score calculation
    total_score = sum(payload.responses.values())

    record = PHQAssessment(
        user_id=payload.user_id,
        study_day=payload.study_day,
        responses=payload.responses,
        total_score=total_score,
        submitted_at=datetime.now(timezone.utc)
    )

    try:
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="PHQ already submitted for this study day"
        )

    # 4️⃣ Clean response
    return {
        "status": "ok",
        "user_id": payload.user_id,
        "study_day": payload.study_day,
        "total_score": total_score
    }


