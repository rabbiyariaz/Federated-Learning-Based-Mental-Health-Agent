from fastapi import APIRouter
from app.schemas import EMARequest

router = APIRouter(prefix="/ema", tags=["EMA"])

@router.post("/")
def create_ema(entry: EMARequest):
    # for now: dummy response
    return {
        "message": "EMA entry saved successfully",
        "study_day": entry.study_day
    }

@router.get("/")
def get_ema(user_id: str):
    # dummy response
    return []
