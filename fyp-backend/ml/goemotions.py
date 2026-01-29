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

    # Apply softmax to get probabilities
    probs = F.softmax(logits, dim=-1)
    probs = probs.squeeze().cpu().numpy()

    # Get label mapping from model config
    id2label = model.config.id2label
    num_labels = len(id2label)

    # Create emotion probabilities dictionary
    emotion_probs = {}
    for i in range(num_labels):
        label = id2label.get(i) or id2label.get(str(i)) or f"label_{i}"
        emotion_probs[label] = float(probs[i])

    # Sort probabilities from highest to lowest
    sorted_probs = dict(sorted(emotion_probs.items(), key=lambda x: x[1], reverse=True))

    # Get the emotion with highest probability
    predicted_emotion = max(emotion_probs.items(), key=lambda x: x[1])[0]

    return {
        "emotion": predicted_emotion,
        "emotion_probs": sorted_probs
    }