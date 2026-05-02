from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import os
import re
import secrets
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Session as SessionModel

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
ALGORITHM = "HS256"
SESSION_EXPIRE_DAYS = 30
RECOVERY_CODE_LENGTH = 6

security = HTTPBearer()


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _create_session_token(session_id: str, token_type: str, expires_delta: timedelta):
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "session_id": session_id,
        "type": token_type,
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_days: int = None):
    """Create a session token (default: 30 days)"""
    if expires_days is None:
        expires_days = SESSION_EXPIRE_DAYS
    session_id = data.get("session_id")
    if not session_id:
        raise ValueError("session_id is required")
    return _create_session_token(
        session_id=session_id,
        token_type="access",
        expires_delta=timedelta(days=expires_days),
    )


def generate_recovery_code() -> str:
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return "".join(secrets.choice(chars) for _ in range(RECOVERY_CODE_LENGTH))


def hash_recovery_code(recovery_code: str) -> str:
    normalized = re.sub(r"[^A-Z0-9]", "", recovery_code.upper())
    if not normalized:
        raise ValueError("recovery_code is required")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _decode_token(credentials: HTTPAuthorizationCredentials, expected_type: str) -> str:
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        session_id = payload.get("session_id")
        token_type = payload.get("type")

        if not session_id or token_type != expected_type:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return session_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def verify_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    session_id = _decode_token(credentials, "access")

    existing_session = (
        db.query(SessionModel)
        .filter(SessionModel.session_id == session_id)
        .first()
    )

    now = datetime.now(timezone.utc)
    if not existing_session:
        raise HTTPException(status_code=401, detail="Session not found")

    if existing_session.is_revoked:
        raise HTTPException(status_code=401, detail="Session revoked")

    expires_at = _normalize_datetime(existing_session.expires_at)
    if expires_at is not None and expires_at < now:
        raise HTTPException(status_code=401, detail="Session expired")

    if not existing_session.recovery_code_hash:
        recovery_code = generate_recovery_code()
        existing_session.recovery_code_hash = hash_recovery_code(recovery_code)
        request.state.generated_recovery_code = recovery_code

    existing_session.last_active_at = now
    db.add(existing_session)
    db.commit()

    return session_id
