from pydantic import BaseModel
from typing import Dict

class EMARequest(BaseModel):
    user_id: str
    study_day: int
    responses: Dict[int, int]

class PHQRequest(BaseModel):
    user_id: str
    day: int
    responses: Dict[int, int]