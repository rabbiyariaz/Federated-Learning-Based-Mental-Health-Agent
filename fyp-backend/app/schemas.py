from pydantic import BaseModel
from typing import Dict, Union
from datetime import date, datetime


class SessionCreate(BaseModel):
    pass


class SessionResponse(BaseModel):
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class EMACreate(BaseModel):
    user_id: str
    date_submitted: date
    responses: Dict[str, Union[int, str]]

class PHQCreate(BaseModel):
    user_id: str
    study_day: int
    responses: Dict[str, int]
