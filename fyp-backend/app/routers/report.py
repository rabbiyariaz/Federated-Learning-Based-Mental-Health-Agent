from fastapi import APIRouter

router = APIRouter(prefix="/report", tags=["Report"])

@router.get("/")
def get_report(user_id: str):
    return {
        "phq_change": -5,
        "ema_completion_rate": 85
    }
