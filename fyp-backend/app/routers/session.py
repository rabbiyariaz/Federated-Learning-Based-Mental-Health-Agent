from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from datetime import datetime, timedelta, timezone
import uuid
from app.auth import create_access_token, generate_recovery_code, hash_recovery_code, _normalize_datetime, verify_token
from app.init_db import ensure_session_recovery_columns


router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.get("/me")
async def get_current_session(session_id: str = Depends(verify_token)):
    return {"session_id": session_id}


@router.post("/create", response_model=schemas.TokenResponse)
async def create_session(db: Session = Depends(get_db)):
    """Create a new anonymous participant identity"""

    ensure_session_recovery_columns(db.get_bind())

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    recovery_code = generate_recovery_code()

    db_session = models.Session(
        session_id=session_id,
        created_at=now,
        expires_at=now + timedelta(days=30),
        last_active_at=now,
        is_revoked=False,
        recovery_code_hash=hash_recovery_code(recovery_code),
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    access_token = create_access_token(data={"session_id": session_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "recovery_code": recovery_code,
    }


@router.post("/restore", response_model=schemas.TokenResponse)
async def restore_session(payload: schemas.RecoveryCodeRequest, db: Session = Depends(get_db)):
    """Restore an existing session using a recovery code."""

    ensure_session_recovery_columns(db.get_bind())

    recovery_hash = hash_recovery_code(payload.recovery_code)
    db_session = (
        db.query(models.Session)
        .filter(models.Session.recovery_code_hash == recovery_hash)
        .first()
    )

    now = datetime.now(timezone.utc)

    if not db_session:
        raise HTTPException(status_code=401, detail="Invalid recovery code")

    if db_session.is_revoked:
        raise HTTPException(status_code=401, detail="Session revoked")

    expires_at = _normalize_datetime(db_session.expires_at)
    if expires_at is not None and expires_at < now:
        raise HTTPException(status_code=401, detail="Session expired")

    db_session.last_active_at = now
    db_session.expires_at = now + timedelta(days=30)
    db.add(db_session)
    db.commit()

    access_token = create_access_token(data={"session_id": db_session.session_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


