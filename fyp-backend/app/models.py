from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from app.database import Base
from sqlalchemy.sql import func


class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String, unique=True,primary_key=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False, index=True)
    last_active_at = Column(DateTime, nullable=False, index=True)
    is_revoked = Column(Boolean, nullable=False, default=False, index=True)
    recovery_code_hash = Column(String, unique=True, nullable=True, index=True)


class PHQAssessment(Base):
    __tablename__ = "phq_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("sessions.session_id"),index=True,)
    responses = Column(JSON)
    total_score = Column(Integer, index=True)
    severity_level = Column(String, index=True)

    submitted_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )    


class EMAEntry(Base):
   
    __tablename__ = "ema_entries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("sessions.session_id"),nullable=False,  index=True)
    date_submitted = Column(Date, nullable=False)
    responses = Column(JSON, nullable=False)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("user_id", "date_submitted", name="uq_ema_user_date"),
    )



class TextEntry(Base):

    __tablename__ = "text_entries"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        String,
        ForeignKey("sessions.session_id"),   # reference actual user table
        nullable=False,
        index=True
    )

    text = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )