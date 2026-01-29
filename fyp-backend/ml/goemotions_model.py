# ml/goemotions_model.py
from .base import BaseModel
from .goemotions import predict_emotion

class GoEmotionsModel(BaseModel):
    name = "goemotions"

    def load(self):
        # model loads lazily inside predict_emotion
        pass

    def predict(self, text: str) -> dict:
        return predict_emotion(text)
