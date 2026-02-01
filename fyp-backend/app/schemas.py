from pydantic import BaseModel
from typing import Dict

class EMARequest(BaseModel):
    user_id: str
    study_day: int
    responses: Dict[str, int]

class PHQCreate(BaseModel):
    user_id: str
    study_day: int
    responses: Dict[str, int]
