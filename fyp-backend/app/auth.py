from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Session as SessionModel

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()


def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        session_id = payload.get("session_id")
        if not session_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        existing_session = (
            db.query(SessionModel)
            .filter(SessionModel.session_id == session_id)
            .first()
        )

        if not existing_session:
            db.add(SessionModel(session_id=session_id))
            db.commit()

        return session_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")