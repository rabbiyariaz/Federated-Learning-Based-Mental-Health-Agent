from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app.models import PHQAssessment
from app.schemas import PHQCreate
from app.database import get_db
from app.auth import verify_token

router = APIRouter(prefix="/phq")



@router.post("")

def submit_phq(payload: PHQCreate,
               session_id: str = Depends(verify_token),
               db: Session = Depends(get_db)):

    # 2️⃣ Validate PHQ-8 responses
    if len(payload.responses) != 8:
        raise HTTPException(400, "PHQ-8 requires exactly 8 responses")

    if any(v not in [0, 1, 2, 3] for v in payload.responses.values()):
        raise HTTPException(400, "PHQ responses must be between 0 and 3")

    # 3️⃣ Backend-controlled score calculation
    total_score = sum(payload.responses.values())

    if total_score <= 4:
        severity = "minimal"
    elif total_score <= 9:
        severity = "mild"
    elif total_score <= 14:
        severity = "moderate"
    elif total_score <= 19:
        severity = "moderately_severe"
    else:
        severity = "severe"

    record = PHQAssessment(
        user_id=session_id, 
        responses=payload.responses,
        total_score=total_score,
        severity_level=severity,
        submitted_at=datetime.now(timezone.utc)
    )

    try:
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            
        )

    # 4️⃣ Clean response
    return {
        "status": "ok",
        "total_score": total_score,
        "severity": severity


    }


