from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from datetime import datetime, timedelta, timezone
import uuid
from app.auth import create_access_token


router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.post("/create", response_model=schemas.TokenResponse)
async def create_session(db: Session = Depends(get_db)):
    """Create a new anonymous participant identity"""

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db_session = models.Session(
        session_id=session_id,
        created_at=now,
        expires_at=now + timedelta(days=30),
        last_active_at=now,
        is_revoked=False,
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    access_token = create_access_token(data={"session_id": session_id})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


