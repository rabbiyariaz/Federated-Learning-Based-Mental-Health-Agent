from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

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
        raise HTTPException(status_code=400, detail="Invalid study day")

    # 2️⃣ Validate PHQ-8 responses
    if len(payload.responses) != 8:
        raise HTTPException(status_code=400, detail="PHQ-8 requires exactly 8 responses")

    if any(v not in [0, 1, 2, 3] for v in payload.responses.values()):
        raise HTTPException(status_code=400, detail="PHQ responses must be between 0 and 3")

    # 3️⃣ Prevent duplicate submission for same user + study day
    existing = db.query(PHQAssessment).filter(
        PHQAssessment.user_id == payload.user_id,
        PHQAssessment.study_day == payload.study_day
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="PHQ already submitted for this study day"
        )

    # 4️⃣ Backend-controlled score calculation
    total_score = sum(payload.responses.values())

    # 5️⃣ Persist assessment
    record = PHQAssessment(
        user_id=payload.user_id,
        study_day=payload.study_day,
        responses=payload.responses,
        total_score=total_score,
        submitted_at=datetime.utcnow()
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    # 6️⃣ Clean response
    return {
        "status": "ok",
        "user_id": payload.user_id,
        "study_day": payload.study_day,
        "total_score": total_score
    }
# The previous simple implementation has been replaced with the above code.


# from fastapi import APIRouter
# from app.schemas import PHQRequest

# router = APIRouter(prefix="/phq", tags=["PHQ"])

# @router.post("/")
# def create_phq(data: PHQRequest):
#     total_score = sum(data.responses.values())
#     return {
#         "message": "PHQ assessment saved successfully",
#         "total_score": total_score
#     }
