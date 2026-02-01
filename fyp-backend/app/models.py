from sqlalchemy import Column, Integer, String, DateTime, JSON, Date
from datetime import datetime
from app.database import Base


class PHQAssessment(Base):
    __tablename__ = "phq_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    study_day = Column(Integer)
    responses = Column(JSON)
    total_score = Column(Integer)
    submitted_at = Column(DateTime, default=datetime.utcnow)


class EMAEntry(Base):
    __tablename__ = "ema_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    study_day = Column(Integer)
    responses = Column(JSON)
    submitted_at = Column(DateTime, default=datetime.utcnow)
