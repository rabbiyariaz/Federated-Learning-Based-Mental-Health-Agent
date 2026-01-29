# ml/daic_model.py
from .base import BaseModel
from .daic import load_daic, predict_phq

class DAICModel(BaseModel):
    name = "daic_phq8"

    def load(self):
        load_daic()

    def predict(self, text: str) -> dict:
        return predict_phq(text)
