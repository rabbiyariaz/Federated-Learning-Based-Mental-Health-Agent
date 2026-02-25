from sqlalchemy import Column, Integer, String, DateTime, JSON, Date, UniqueConstraint
from datetime import datetime, timedelta, timezone
from app.database import Base
from sqlalchemy import ForeignKey


class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String, unique=True,primary_key=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PHQAssessment(Base):
    __tablename__ = "phq_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("sessions.session_id"),index=True,)
    study_day = Column(Integer)
    responses = Column(JSON)
    total_score = Column(Integer)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("user_id", "study_day", name="uq_user_study_day"),
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
