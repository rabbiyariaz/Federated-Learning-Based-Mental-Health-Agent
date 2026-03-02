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
        daic = self.models["phq"].predict(text)


        if daic.get("crisis_detected"):
            return {
                "primary_emotion": "distress",
                "dominant_emotions": [],
                "text_risk_level": daic["risk_level"],
                "risk_score": daic["risk_score"],
            }


        return {
            "primary_emotion": emotion["primary_emotion"],
            "dominant_emotions": emotion["dominant_emotions"],
            "text_risk_level": daic["risk_level"],
            "risk_score": daic["risk_score"],
        }
