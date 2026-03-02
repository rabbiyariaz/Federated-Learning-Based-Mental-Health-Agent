# ml/daic_model.py
from .base import BaseModel
from .daic import load_daic, predict_daic_session, predict_daic_weekly
from typing import List, Dict
class DAICModel(BaseModel):
    name = "daic_risk"
    def load(self):
        load_daic()

    def predict(self, text: str) -> dict:
        # Session-level prediction
        return predict_daic_session(text)

    def predict_weekly(self, reflections: List[str]) -> Dict:

        # Weekly aggregated prediction
        return predict_daic_weekly(reflections)