import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from .config import ModelConfig

# Singleton pattern for model loading
_model = None
_tokenizer = None


def _load_model():
    """Load the GoEmotions model and tokenizer (singleton pattern)."""
    global _model, _tokenizer

    if _model is None or _tokenizer is None:
        # Load tokenizer and model
        _tokenizer = AutoTokenizer.from_pretrained(str(ModelConfig.GOEMOTIONS_MODEL_PATH))  # ✅
        _model = AutoModelForSequenceClassification.from_pretrained(str(ModelConfig.GOEMOTIONS_MODEL_PATH))  # ✅

        # Set model to evaluation mode
        _model.eval()

    return _model, _tokenizer




def predict_emotion(text: str) -> dict:
    """
    Predict emotion from text using the GoEmotions model.

    Args:
        text: Input text string

    Returns:
        Dictionary with:
        - emotion: The predicted emotion (highest probability)
        - emotion_probs: Dictionary of all emotion probabilities (sorted highest to lowest)

    Raises:
        ValueError: If text is empty or None
    """
    if not text or not text.strip():
        raise ValueError("Input text cannot be empty")

    model, tokenizer = _load_model()

    # Tokenize input
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=ModelConfig.GOEMOTIONS_MAX_SEQ_LEN,  # ✅
        padding=True
    )

    # Predict with no gradient computation
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits

    probs = torch.sigmoid(logits)
    probs = probs.squeeze().cpu().numpy()

    id2label = model.config.id2label
    emotion_scores = {
        id2label[i]: float(probs[i])
        for i in range(len(id2label))
    }

    # Sort descending
    sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)

    threshold = 0.25
    max_emotions = 3

    # Primary emotion = highest probability always
    primary_emotion = sorted_emotions[0][0]

    # Keep only meaningful emotions
    filtered = [e for e in sorted_emotions if e[1] >= threshold]

    # Fallback to top 1 if nothing passes threshold
    if not filtered:
        top_emotions = sorted_emotions[:1]
    else:
        top_emotions = filtered[:max_emotions]

    return {
        "primary_emotion": primary_emotion,
        "dominant_emotions": [e[0] for e in top_emotions]
    }