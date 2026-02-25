from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.post("/create", response_model=schemas.SessionResponse)
async def create_session(db: Session = Depends(get_db)):
    """Create a new anonymous participant identity"""

    session_id = str(uuid.uuid4())

    db_session = models.Session(
        session_id=session_id
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session


@router.get("/validate/{session_id}")
async def validate_session(session_id: str, db: Session = Depends(get_db)):
    """Check if session exists"""

    db_session = db.query(models.Session).filter(
        models.Session.session_id == session_id
    ).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"valid": True}