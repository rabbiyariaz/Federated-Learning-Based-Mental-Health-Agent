
from fastapi import APIRouter
from app.schemas import PHQRequest

router = APIRouter(prefix="/phq", tags=["PHQ"])

@router.post("/")
def create_phq(data: PHQRequest):
    total_score = sum(data.responses.values())
    return {
        "message": "PHQ assessment saved successfully",
        "total_score": total_score
    }
