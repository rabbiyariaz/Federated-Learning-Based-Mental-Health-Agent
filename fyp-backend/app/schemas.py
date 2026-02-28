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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class PHQCreate(BaseModel):
    responses: Dict[str, int]



class EMACreate(BaseModel):
    date_submitted: date
    responses: Dict[str, Union[int, str]]