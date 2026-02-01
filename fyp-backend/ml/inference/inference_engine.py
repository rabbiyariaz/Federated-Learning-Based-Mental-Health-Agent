# ml/services/inference_service.py
from ..daic_model import DAICModel
from ..goemotions_model import GoEmotionsModel

class InferenceService:
    def __init__(self):
        self.models = {
            "emotion": GoEmotionsModel(),
            "phq": DAICModel(),
        }

        # Load heavy models at startup
        for model in self.models.values():
            model.load()

    def run(self, text: str) -> dict:
        emotion = self.models["emotion"].predict(text)
        phq = self.models["phq"].predict(text)

        return {
            "emotion": emotion["emotion"],
            "emotion_probs": emotion["emotion_probs"],
            "phq8_score": phq["phq8_score"],
            "phq8_binary": phq["phq8_binary"],
        }
