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



import re
import torch
import torch.nn.functional as F

CONTRAST_WORDS = r"\b(but|however|although|though)\b"
SECOND_CLAUSE_WEIGHT = 0.55
FIRST_CLAUSE_WEIGHT = 0.45
DOMINANCE_MARGIN = 0.15


def _predict_single_clause(text: str, model, tokenizer) -> dict:
    """
    Predict emotion probabilities for a single clause only.
    """
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=ModelConfig.GOEMOTIONS_MAX_SEQ_LEN,
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits

    probs = torch.sigmoid(logits).squeeze().cpu().numpy()

    id2label = model.config.id2label

    return {
        id2label[i]: float(probs[i])
        for i in range(len(id2label))
    }


def predict_emotion(text: str) -> dict:
    """
    Clause-aware emotion prediction with dominance margin logic.
    """

    if not text or not text.strip():
        raise ValueError("Input text cannot be empty")

    model, tokenizer = _load_model()

    # -------------------------
    # 1️⃣ Split on contrast words
    # -------------------------
    clauses = re.split(CONTRAST_WORDS, text, flags=re.IGNORECASE)
    clauses = [c.strip() for c in clauses if c.strip() and c.lower() not in ["but", "however", "although", "though"]]

    # -------------------------
    # 2️⃣ Score clauses
    # -------------------------
    if len(clauses) == 1:
        final_scores = _predict_single_clause(clauses[0], model, tokenizer)

    else:
        first_scores = _predict_single_clause(clauses[0], model, tokenizer)
        second_scores = _predict_single_clause(clauses[1], model, tokenizer)

        # Weighted combination
        final_scores = {}
        for emotion in first_scores:
            final_scores[emotion] = (
                FIRST_CLAUSE_WEIGHT * first_scores[emotion] +
                SECOND_CLAUSE_WEIGHT * second_scores[emotion]
            )

    # -------------------------
    # 3️⃣ Sort emotions
    # -------------------------
    sorted_emotions = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)

    top1, top2 = sorted_emotions[:2]

    if abs(top1[1] - top2[1]) < DOMINANCE_MARGIN:
        primary_emotion = "mixed_affect"
    else:
        primary_emotion = top1[0]
    # -------------------------
    # 5️⃣ Threshold filtering
    # -------------------------
    threshold = 0.15
    max_emotions = 4

    filtered = [e for e in sorted_emotions if e[1] >= threshold]

    if not filtered:
        top_emotions = sorted_emotions[:1]
    else:
        top_emotions = filtered[:max_emotions]

    return {
        "primary_emotion": primary_emotion,
        "dominant_emotions": [e[0] for e in top_emotions],
        "all_emotion_probabilities": final_scores
    }


# def predict_emotion(text: str) -> dict:
#     """
#     Predict emotion from text using the GoEmotions model.

#     Args:
#         text: Input text string

#     Returns:
#         Dictionary with:
#         - emotion: The predicted emotion (highest probability)
#         - emotion_probs: Dictionary of all emotion probabilities (sorted highest to lowest)

#     Raises:
#         ValueError: If text is empty or None
#     """
#     if not text or not text.strip():
#         raise ValueError("Input text cannot be empty")

#     model, tokenizer = _load_model()

#     # Tokenize input
#     inputs = tokenizer(
#         text,
#         return_tensors="pt",
#         truncation=True,
#         max_length=ModelConfig.GOEMOTIONS_MAX_SEQ_LEN,  # ✅
#         padding=True
#     )

#     # Predict with no gradient computation
#     with torch.no_grad():
#         outputs = model(**inputs)
#         logits = outputs.logits

#     probs = torch.sigmoid(logits)
#     probs = probs.squeeze().cpu().numpy()
#     print(probs)

#     id2label = model.config.id2label
#     emotion_scores = {
#         id2label[i]: float(probs[i])
#         for i in range(len(id2label))
#     }

#     # Sort descending
#     sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)

#     threshold = 0.20
#     max_emotions = 4

#     # Primary emotion = highest probability always
#     primary_emotion = sorted_emotions[0][0]

#     # Keep only meaningful emotions
#     filtered = [e for e in sorted_emotions if e[1] >= threshold]

#     # Fallback to top 1 if nothing passes threshold
#     if not filtered:
#         top_emotions = sorted_emotions[:1]
#     else:
#         top_emotions = filtered[:max_emotions]
#     print(emotion_scores)

#     return {
#         "primary_emotion": primary_emotion,
#         "dominant_emotions": [e[0] for e in top_emotions],
#         "all_emotion_probabilities": emotion_scores

#     }