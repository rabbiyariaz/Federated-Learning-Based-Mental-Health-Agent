from __future__ import annotations

import re
import torch
import torch.nn as nn
from transformers import AutoTokenizer, DistilBertModel
from torch.nn.utils.rnn import pad_packed_sequence

from .config import ModelConfig
from .goemotions import predict_emotion


# ---------------------------------------------------------------------------
# Pattern lists
# ---------------------------------------------------------------------------

PASSIVE_RISK = [
    r"\bwant to disappear\b",
    r"\bdon'?t want to (exist|be here|be alive)\b",
]

AMBIGUOUS = [
    r"\bnot sure\b.{0,20}\b(hurt myself|do something stupid)\b",
    r"\bcan'?t (promise|guarantee)\b.{0,20}\b(won'?t hurt|stay safe)\b",
    r"\bnot sure\b.{0,40}(hurt myself|do something|stay safe|control myself)",
    r"\bwon't\b.{0,20}(do something stupid|hurt myself)",
    r"\b(i\s+)?guess\b.{0,20}\b(won't|will not)\b.{0,20}\b(hurt myself|do something stupid|stay safe)\b",
]

RECOVERY_SIGNALS = [
    r"\b(used to|last year|back then|went through a phase)\b.{0,120}"
    r"(but now|now i'?m|feeling (better|stable|okay)|started therapy|not (in that place|thinking like that))",
    r"\b(not in that place|not thinking like that|no longer feel)\b",
]

HIGH_RISK_PATTERNS = [
    r"\bdisappear(ed|ing)?\b",
    r"\bno (real )?point\b",
    r"\bsee no point\b",
    r"\bbetter off\b",
    r"\bgive up\b",
    r"\bwhat'?s the point\b",
    r"\bnothing (will|is going to) change\b",
    r"\btired of pretending\b",
    r"\bwithout me\b",
    r"\bi feel like a burden\b",
    r"\bi hate myself\b",
    r"\bi am worthless\b",
    r"\bi am useless\b",
    r"\bi feel trapped\b",
]

# FIX 8: Removed duplicate patterns (wish wake up appeared 3×).
CRISIS_PATTERNS = [
    r"\b(want to|going to|try to|plan to) (die|kill myself|end my life|hurt myself|harm myself)\b",
    r"\b(kill|harm|hurt|end) (myself|my life)\b",
    r"\bsuicid(e|al)\b",
    r"\bself[\s-]harm\b",
    r"\bcut(ting)? myself\b",
    r"\bbetter off dead\b",
    r"\b(no|not|don'?t) (want|need) to (live|be here|exist|go on)\b",
    r"\bend it all\b",
    r"\bcan'?t go on\b",
    r"\b(edge of|off) (a )?(cliff|bridge|building|roof|mountain).{0,30}(die|kill|harm|jump|end)\b",
    r"\b(die|kill|harm|jump|end).{0,30}(edge of|off) (a )?(cliff|bridge|building|roof|mountain)\b",
    r"\bno reason to (live|continue|stay)\b",
    r"\bthinking (about|of) (dying|suicide|killing myself|ending it)\b",
    r"\b(made|writing|wrote) (a suicide note|final preparations)\b",
    r"\bwish (i )?(wouldn'?t|didn'?t) wake up\b",   # deduplicated
    r"\bwish (i )?(was|were) dead\b",                # deduplicated
    r"\bbetter off if (i )?was dead\b",
    r"\bi'?d be better off dead\b",
    r"\bi don'?t want to wake up\b",
    r"\bi don'?t care if i die\b",
    r"\bi hope i die\b",
    r"\bi want to disappear forever\b",
    r"\beveryone would be better off without me\b",
    r"\bi am a burden\b",
    r"\bi wish i (didn'?t|did not) exist\b",
]

# ---------------------------------------------------------------------------
# FIX 3: Three-type crisis classifier — replaces contains_crisis_content
# Each type gets different handling so rules don't conflict with each other.
# ---------------------------------------------------------------------------

# Historical: past-tense crisis language + recovery context
HISTORICAL_CRISIS_PATTERNS = [
    r"\b(used to|last year|back then|at one point|once|previously|in the past)\b.{0,80}"
    r"(suicide|kill myself|end my life|self.harm|hurt myself|harm myself)\b",
    r"\b(thought about|struggled with|dealt with)\b.{0,40}"
    r"(suicide|self.harm|killing myself|hurting myself)\b"
    r".{0,80}(but now|now i|i'?m (better|okay|fine|stable)|no longer|not anymore)\b",
]

# Negated: explicit denial of suicidal intent
NEGATED_CRISIS_PATTERNS = [
    r"\b(i am not|i'm not|i will not|i won't|i would not|i wouldn't)\b.{0,40}"
    r"(kill myself|commit suicide|end my life|hurt myself|harm myself)\b",
    r"\bnot (going to|planning to|thinking of)\b.{0,30}"
    r"(kill myself|suicide|harm myself)\b",
]

# Active: present/future intent — hard override to Elevated
ACTIVE_CRISIS_PATTERNS = [
    r"\b(i am|i'm|i will|i'm going to|i plan to|i want to|i'm about to)\b.{0,40}"
    r"(kill myself|commit suicide|end my life|hurt myself|harm myself)\b",
    r"\b(going to|will) (die|kill myself|end it|end my life)\b",
    r"\bi want to (die|kill myself|end my life|end it all)\b",
    r"\bsuicid(e|al)\b(?!.{0,60}(used to|before|back then|last|history|past|research|friend|someone|they|he|she))",
    r"\b(kill|harm|hurt) myself\b",
    r"\bend (my life|it all)\b",
]


def classify_crisis_type(text: str) -> str | None:
    """
    Returns 'active' | 'negated' | 'historical' | None.
    Order matters: historical checked first because it often contains
    active-sounding words that would otherwise trigger active patterns.
    """
    text_lower = text.lower()

    if any(re.search(p, text_lower) for p in HISTORICAL_CRISIS_PATTERNS):
        return "historical"

    if any(re.search(p, text_lower) for p in NEGATED_CRISIS_PATTERNS):
        return "negated"

    if any(re.search(p, text_lower) for p in ACTIVE_CRISIS_PATTERNS):
        return "active"

    return None


# Kept for weekly aggregation which uses the old contains_crisis_content path
NEGATION_WINDOW = [
    r"\b(not|no longer|never|don't|won't|wouldn't|didn't)\b",
    r"\b(i\s+)?(don't think|do not think)\b",
    r"\b(i\s+)?guess\b.{0,20}\b(won't|will not)\b",
]


def contains_crisis_content(text: str) -> bool:
    """Legacy function — used only by check_reflections_for_crisis."""
    text_lower = text.lower()
    for pattern in CRISIS_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            window = text_lower[max(0, match.start() - 100):match.start()]
            negated = any(re.search(p, window) for p in NEGATION_WINDOW)
            if not negated:
                return True
    return False


def contains_high_risk_phrase(text: str) -> bool:
    text_lower = text.lower()
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False


def check_reflections_for_crisis(
    reflections: list[str],
) -> tuple[bool, list[str], list[str]]:
    crisis_found = False
    crisis_reflections: list[str] = []
    crisis_texts: list[str] = []

    for idx, reflection in enumerate(reflections):
        if contains_crisis_content(reflection):
            crisis_found = True
            crisis_reflections.append(f"Reflection {idx + 1}: {reflection[:100]}...")
            crisis_texts.append(reflection)

    return crisis_found, crisis_reflections, crisis_texts


def escalate_one_level(risk: str) -> str:
    if risk == "Low":
        return "Moderate"
    elif risk == "Moderate":
        return "Elevated"
    return risk


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class DistilBertMultiTaskWithAggregator(nn.Module):
    def __init__(self, encoder_ckpt: str):
        super().__init__()
        self.encoder = DistilBertModel.from_pretrained(encoder_ckpt)
        enc_dim = self.encoder.config.hidden_size

        self.emotion_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(enc_dim // 2, ModelConfig.DAIC_EMOTION_NUM_LABELS),
        )
        self.phq_reg_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Linear(enc_dim // 2, 1),
        )
        self.phq_bin_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Linear(enc_dim // 2, 1),
        )

        self.aggr_lstm = nn.LSTM(
            input_size=enc_dim,
            hidden_size=ModelConfig.DAIC_AGGR_HIDDEN,
            num_layers=ModelConfig.DAIC_AGGR_LAYERS,
            batch_first=True,
            bidirectional=True,
            dropout=(
                ModelConfig.DAIC_AGGR_DROPOUT
                if ModelConfig.DAIC_AGGR_LAYERS > 1
                else 0.0
            ),
        )
        self.session_phq_reg = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1),
        )
        self.session_phq_bin = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1),
        )

    def forward_utterance(self, input_ids, attention_mask):
        out = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
            return_dict=True,
        )
        return out.last_hidden_state[:, 0, :]

    def forward_session(self, utter_embs_padded, lengths):
        packed = torch.nn.utils.rnn.pack_padded_sequence(
            utter_embs_padded, lengths=lengths, batch_first=True, enforce_sorted=False
        )
        packed_output, _ = self.aggr_lstm(packed)
        padded_output, _ = pad_packed_sequence(packed_output, batch_first=True)
        session_repr = padded_output.mean(dim=1)
        phq_reg = self.session_phq_reg(session_repr).squeeze(-1)
        phq_bin_logit = self.session_phq_bin(session_repr).squeeze(-1)
        return phq_reg, phq_bin_logit


_tokenizer = None
_model = None
_device = torch.device(
    "cuda" if torch.cuda.is_available() and ModelConfig.ENABLE_GPU else "cpu"
)

# FIX 7: "distress" removed — not in the 8-class taxonomy.
# Implausible GoEmotions labels on crisis statements are corrected below.
VALID_EMOTIONS = {"anger", "disgust", "fear", "joy", "sadness", "neutral", "surprise", "mixed_affect"}


def _split_into_utterances(text: str):
    parts = [p.strip() for p in re.split(r"[.\n!?]+", text) if p.strip()]
    return parts[: ModelConfig.DAIC_MAX_UTTERANCES] if parts else [text.strip()]


def load_daic():
    global _tokenizer, _model

    if _model is not None and _tokenizer is not None:
        return _tokenizer, _model

    if not ModelConfig.DAIC_CHECKPOINT.exists():
        raise FileNotFoundError(
            f"DAIC checkpoint not found: {ModelConfig.DAIC_CHECKPOINT}"
        )
    if not ModelConfig.DAIC_TOKENIZER_DIR.exists():
        raise FileNotFoundError(
            f"Tokenizer directory not found: {ModelConfig.DAIC_TOKENIZER_DIR}"
        )

    tok = AutoTokenizer.from_pretrained(str(ModelConfig.DAIC_TOKENIZER_DIR))
    model = DistilBertMultiTaskWithAggregator(
        encoder_ckpt=str(ModelConfig.DAIC_TOKENIZER_DIR)
    )
    state_dict = torch.load(str(ModelConfig.DAIC_CHECKPOINT), map_location="cpu")
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    model.to(_device)

    _tokenizer, _model = tok, model
    return _tokenizer, _model


# ---------------------------------------------------------------------------
# Session prediction — fully rewritten with 4-layer architecture
# ---------------------------------------------------------------------------

def predict_daic_session(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty text")

    text_lower = text.lower()

    # ── LAYER 1: Safety gate ────────────────────────────────────────────────
    # FIX 3: Classify crisis type FIRST, before ML runs.
    # Active crisis → return Elevated immediately, ML is irrelevant.
    # This is the only place that sets risk unconditionally.
    crisis_type = classify_crisis_type(text)

    if crisis_type == "active":
        # FIX 1: Hard set to Elevated — not escalate_one_level.
        # FIX 9: Override implausible emotion labels on active crisis.
        emotion_result = predict_emotion(text)
        primary_emotion = emotion_result.get("primary_emotion", "fear").lower()
        if primary_emotion in {"anger", "surprise", "neutral", "joy", "disgust"}:
            primary_emotion = "fear"  # clinically correct for active crisis
        print(f"[CRISIS GATE] Active crisis detected. Forcing Elevated.")
        return {
            "risk_level": "Elevated",
            "risk_score": 0.95,
            "emotion": primary_emotion,
            "crisis_type": "active",
        }

    # ── LAYER 2: ML model ───────────────────────────────────────────────────
    tokenizer, model = load_daic()

    enc = tokenizer(
        text,
        truncation=True,
        max_length=ModelConfig.DAIC_MAX_SEQ_LEN,
        padding=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        pooled = model.forward_utterance(
            enc["input_ids"].to(_device),
            enc["attention_mask"].to(_device),
        )
        logit = model.phq_bin_head(pooled).squeeze(-1)
        temperature = 1.8
        prob = float(torch.sigmoid(logit / temperature).cpu().item())

    # Emotion prediction
    emotion_result = predict_emotion(text)
    primary_emotion = emotion_result.get("primary_emotion", "neutral").lower()
    dominant_emotions = emotion_result.get("dominant_emotions", [])
    final_emotion = primary_emotion

    # FIX 4: Neutral dampener moved AFTER crisis gate.
    # Only applies when no crisis language is present.
    if primary_emotion == "neutral" and not contains_high_risk_phrase(text):
        prob *= 0.75

    print(f"[SESSION ANALYSIS] Text: '{text}' | DAIC prob: {prob:.4f} | crisis_type: {crisis_type}")

    # Base risk from ML probability
    if prob < 0.45:
        risk = "Low"
    elif prob < 0.75:
        risk = "Moderate"
    else:
        risk = "Elevated"

    # ── LAYER 3: Single adjuster ────────────────────────────────────────────
    # Each branch is isolated — only one fires, they cannot chain.

    escalation_used = False

    if crisis_type == "negated":
        # FIX 1 (negated): Ideation present even if denied — floor at Moderate.
        # ML can push higher but never lower than Moderate.
        if risk == "Low":
            risk = "Moderate"
        # FIX 9: Negated crisis emotion should not be anger/joy
        if final_emotion in {"anger", "joy", "surprise"}:
            final_emotion = "neutral"
        escalation_used = True

    elif crisis_type == "historical":
        # FIX 5: Past-tense + recovery → Low, not Moderate.
        # Let ML decide but dampen aggressively if recovery signals present.
        if any(re.search(p, text_lower) for p in RECOVERY_SIGNALS):
            risk = "Low"
        elif risk == "Elevated":
            risk = "Moderate"  # historical without recovery signal → dampen one step
        escalation_used = True

    else:
        # No crisis language — normal escalation path
        ambiguous = any(re.search(p, text_lower) for p in AMBIGUOUS)
        passive = any(re.search(p, text_lower) for p in PASSIVE_RISK)
        high_risk = contains_high_risk_phrase(text)

        if ambiguous and prob > 0.45 and not escalation_used:
            risk = escalate_one_level(risk)
            escalation_used = True

        elif passive and prob > 0.55 and not escalation_used:
            risk = escalate_one_level(risk)
            escalation_used = True

        elif prob > 0.65 and high_risk and not escalation_used:
            print("HIGH RISK PHRASE detected")
            risk = escalate_one_level(risk)
            # FIX 7: Use "fear" instead of "distress" (not in taxonomy)
            final_emotion = "fear"
            escalation_used = True

        # FIX 6: Elevated dampener guarded against high-risk phrases.
        # Prevents HIGH_RISK escalation being immediately undone.
        if risk == "Elevated" and prob < 0.65 and not high_risk:
            if any(word in text_lower for word in ["empty", "meaningless", "pointless"]):
                risk = "Moderate"

        # FIX 2: Positive dampener guarded with `not escalation_used`.
        # Prevents "I am not okay, I want to kill myself" being downgraded
        # because "okay" appears in the positive word list.
        POSITIVE = ["enjoy", "peace", "happy", "fine", "grateful"]
        # FIX 2: "okay" removed from POSITIVE — too common in distressed speech.
        if not escalation_used:
            if any(word in text_lower for word in POSITIVE):
                if risk == "Moderate" and prob < 0.6:
                    risk = "Low"

    # Surprise correction (only when no crisis involved)
    if crisis_type is None:
        if primary_emotion == "surprise" and prob > 0.60:
            final_emotion = "sadness" if "sadness" in dominant_emotions else "fear"

    # ── LAYER 4: Output validator ───────────────────────────────────────────
    # FIX 7: Enforce taxonomy — no label outside the 8 valid classes.
    if final_emotion not in VALID_EMOTIONS:
        final_emotion = "neutral"

    return {
        "risk_level": risk,
        "risk_score": round(prob, 4),
        "emotion": final_emotion,
        "crisis_type": crisis_type,  # useful for logging/debugging
    }


# ---------------------------------------------------------------------------
# Weekly prediction — unchanged logic, uses classify_crisis_type for
# reflections that triggered contains_crisis_content
# ---------------------------------------------------------------------------

def predict_daic_weekly(reflections: list[str]) -> dict:
    reflections = [r.strip() for r in reflections if r.strip()]
    reflections = reflections[-30:]

    if len(reflections) < 3:
        return {"weekly_risk_level": "Insufficient Data"}

    # Crisis override — uses contains_crisis_content (legacy, fine for weekly)
    has_crisis, crisis_reflections, crisis_texts = check_reflections_for_crisis(reflections)
    if has_crisis:
        all_recovery = all(
            any(re.search(p, r.lower()) for p in RECOVERY_SIGNALS)
            for r in crisis_texts
        )
        if not all_recovery:
            return {
                "weekly_risk_level": "Elevated",
                "risk_score": 0.95,
                "crisis_detected": True,
                "crisis_count": len(crisis_reflections),
                "explanation": ["Crisis phrases detected"],
            }

    tokenizer, model = load_daic()

    scores: list[float] = []
    emotions: list[str] = []

    with torch.no_grad():
        for reflection in reflections:
            enc = tokenizer(
                reflection,
                truncation=True,
                max_length=ModelConfig.DAIC_MAX_SEQ_LEN,
                padding=True,
                return_tensors="pt",
            )
            pooled = model.forward_utterance(
                enc["input_ids"].to(_device),
                enc["attention_mask"].to(_device),
            )
            logit = model.phq_bin_head(pooled).squeeze(-1)
            prob_i = float(torch.sigmoid(logit / 1.8).cpu().item())
            scores.append(prob_i)

            emotion = (
                predict_emotion(reflection).get("primary_emotion", "").lower()
            )
            emotions.append(emotion)

    # Core aggregation
    prob_mean = sum(scores) / len(scores)
    prob_max = max(scores)
    prob_recent = scores[-1]
    prob = 0.5 * prob_recent + 0.3 * prob_mean + 0.2 * prob_max

    explanation_flags: list[str] = []

    if prob_max > 0.90:
        prob = max(prob, 0.80)
        explanation_flags.append("Severe reflection spike detected")
    elif prob_max > 0.80:
        prob = max(prob, 0.70)
        explanation_flags.append("High-risk reflection spike detected")

    # Trend detection
    third = max(len(scores) // 3, 1)
    early_mean = sum(scores[:third]) / third
    late_mean = sum(scores[-third:]) / third
    slope = late_mean - early_mean

    if slope > 0.15:
        prob += 0.05
        explanation_flags.append("Worsening trend detected")

    if len(scores) >= 2 and (scores[-1] - scores[-2]) > 0.25:
        prob += 0.06
        explanation_flags.append("Sudden recent escalation detected")

    # Sentiment modulation
    POSITIVE_SET = {
        "joy", "love", "gratitude", "admiration", "excitement",
        "optimism", "amusement", "pride", "approval", "caring",
        "desire", "relief",
    }
    NEGATIVE_SET = {
        "sadness", "anger", "fear", "grief", "disappointment",
        "disgust", "annoyance", "nervousness", "embarrassment", "remorse",
    }

    total = len(emotions)
    positive_ratio = sum(e in POSITIVE_SET for e in emotions) / total
    negative_ratio = sum(e in NEGATIVE_SET for e in emotions) / total

    if negative_ratio >= 0.70:
        prob += 0.07
        explanation_flags.append("Predominantly negative tone")

    if positive_ratio >= 0.75 and prob < 0.50:
        prob *= 0.95
        explanation_flags.append("Predominantly positive tone")

    # Data strength weighting + clamp
    data_strength = min(len(reflections) / 30, 1.0)
    prob *= 0.85 + 0.15 * data_strength
    prob = max(0.0, min(1.0, prob))

    # Risk bands
    if prob < 0.45:
        risk = "Low"
    elif prob < 0.75:
        risk = "Moderate"
    else:
        risk = "Elevated"

    return {
        "weekly_risk_level": risk,
        "risk_score": round(prob, 4),
        "reflections_analyzed": len(reflections),
        "max_reflection_score": round(prob_max, 4),
        "trend_slope": round(slope, 4),
        "positive_ratio": round(positive_ratio, 2),
        "negative_ratio": round(negative_ratio, 2),
        "explanation": explanation_flags,
        "crisis_detected": False,
    }

# def _analyze_sentiment_override(reflections: list[str], initial_risk: str, prob: float) -> tuple[str, float]:
#     """
#     Analyze sentiment across reflections to detect false positives.
#     If reflections are predominantly positive, override the risk level.
#     """
#     POSITIVE_EMOTIONS = {'joy', 'love', 'gratitude', 'admiration', 'excitement', 'optimism', 'amusement', 'pride', 'approval', 'caring', 'desire', 'relief'}
#     NEGATIVE_EMOTIONS = {'sadness', 'anger', 'fear', 'grief', 'disappointment', 'disgust', 'annoyance', 'nervousness', 'embarrassment', 'remorse'}
    
#     positive_count = 0
#     negative_count = 0
#     neutral_count = 0
    
#     for reflection in reflections:
#         try:
#             emotion_result = predict_emotion(reflection)
#             primary = emotion_result.get('primary_emotion', '').lower()
            
#             if primary in POSITIVE_EMOTIONS:
#                 positive_count += 1
#             elif primary in NEGATIVE_EMOTIONS:
#                 negative_count += 1
#             else:
#                 neutral_count += 1
#         except Exception as e:
#             print(f"[SENTIMENT ANALYSIS] Warning: Could not analyze emotion: {e}")
#             neutral_count += 1
    
#     total = len(reflections)
#     positive_ratio = positive_count / total if total > 0 else 0
#     negative_ratio = negative_count / total if total > 0 else 0
    
#     print(f"[SENTIMENT ANALYSIS] Positive: {positive_count}/{total} ({positive_ratio:.2%}), Negative: {negative_count}/{total} ({negative_ratio:.2%})")
    



#     # Override logic: If majority positive and low risk score, force Low risk
#     if positive_ratio >= 0.75 and prob < 0.55:
#         adjusted_prob = prob * 0.7  # Reduce risk score by 30%
#         print(f"[SENTIMENT OVERRIDE] Strong positive sentiment detected. Adjusting score: {prob:.4f} → {adjusted_prob:.4f}")
#         return "Low", adjusted_prob
    
#     # If moderately positive (50-75%) and score near threshold, nudge to Low
#     if positive_ratio >= 0.50 and prob < 0.50:
#         adjusted_prob = prob * 0.85
#         print(f"[SENTIMENT OVERRIDE] Moderate positive sentiment. Adjusting score: {prob:.4f} → {adjusted_prob:.4f}")
#         return "Low", adjusted_prob
    
#     return initial_risk, prob



# def predict_daic_weekly(reflections: list[str]):
#     reflections = [r.strip() for r in reflections if r.strip()]

#     # Use only most recent 30 reflections
#     reflections = reflections[-30:]

#     if len(reflections) < 3:
#         return {"weekly_risk_level": "Insufficient Data"}

#     # 🚨 Crisis override
#     has_crisis, crisis_reflections = check_reflections_for_crisis(reflections)
#     if has_crisis:
#         return {
#             "weekly_risk_level": "Elevated",
#             "risk_score": 0.95,
#             "crisis_detected": True,
#             "crisis_count": len(crisis_reflections)
#         }

#     tokenizer, model = load_daic()

#     individual_scores = []

#     with torch.no_grad():
#         for reflection in reflections:
#             enc = tokenizer(
#                 reflection,
#                 truncation=True,
#                 max_length=ModelConfig.DAIC_MAX_SEQ_LEN,
#                 padding=True,
#                 return_tensors="pt",
#             )

#             pooled = model.forward_utterance(
#                 enc["input_ids"].to(_device),
#                 enc["attention_mask"].to(_device),
#             )

#             logit = model.phq_bin_head(pooled).squeeze(-1)
#             prob = float(torch.sigmoid(logit).cpu().item())
#             individual_scores.append(prob)

#     # Average score
#     prob = sum(individual_scores) / len(individual_scores)

#     # Initial risk classification
#     if prob < 0.45:
#         risk = "Low"
#     elif prob < 0.75:
#         risk = "Moderate"
#     else:
#         risk = "Elevated"

# # Sentiment correction
#     risk, prob = _analyze_sentiment_override(reflections, risk, prob)

#     return {
#         "weekly_risk_level": risk,
#         "risk_score": round(prob, 4)
#     }

# def predict_daic_weekly(reflections: list[str], use_lstm_threshold: int = 60):
#     """
#     Adaptive weekly risk assessment that chooses the optimal approach based on data volume.
    
#     ADAPTIVE STRATEGY:
#     - If < 3 reflections: Insufficient data
#     - If 3-29 reflections: Use per-utterance scoring + averaging (LSTM expects 80-120)
#     - If >= 30 reflections: Use LSTM aggregator (session-level modeling)
    
#     Args:
#         reflections: List of text reflections
#         use_lstm_threshold: Minimum reflections to use LSTM (default: 30)
        
#     NOTE: DAIC-WOZ LSTM was trained on 80-120 utterance interviews.
#     """
#     reflections = [r.strip() for r in reflections if r.strip()]
#     MAX_WEEKLY_REFLECTIONS = 50
#     if len(reflections) > MAX_WEEKLY_REFLECTIONS:
#         reflections = reflections[-MAX_WEEKLY_REFLECTIONS:]

#     if len(reflections) < 3:
#         return {"weekly_risk_level": "Insufficient Data"}

#     # 🚨 CRITICAL SAFETY CHECK: Detect self-harm/suicide content FIRST
#     has_crisis, crisis_reflections = check_reflections_for_crisis(reflections)
#     if has_crisis:
#         print(f"[CRISIS DETECTED] Self-harm/suicide indicators found in {len(crisis_reflections)} reflection(s)")
#         for crisis_text in crisis_reflections:
#             print(f"  🚨 {crisis_text}")
#         print(f"[CRISIS OVERRIDE] Returning ELEVATED risk regardless of model prediction")
#         return {
#             "weekly_risk_level": "Elevated",
#             "risk_score": 0.95,  # Maximum risk score
#             "crisis_detected": True,
#             "crisis_count": len(crisis_reflections)
#         }

#     tokenizer, model = load_daic()
#     num_reflections = len(reflections)

#     # DECISION: Use LSTM aggregator or per-utterance averaging
#     use_lstm = num_reflections >= use_lstm_threshold
    
#     print(f"[WEEKLY ANALYSIS] Analyzing {num_reflections} reflections...")
#     print(f"[WEEKLY ANALYSIS] Strategy: {'LSTM Aggregator' if use_lstm else 'Per-Utterance Averaging'}")

#     if use_lstm:
#         # === APPROACH 1: LSTM Session Aggregator (for longer sequences) ===
#         enc = tokenizer(
#             reflections,
#             truncation=True,
#             max_length=ModelConfig.DAIC_MAX_SEQ_LEN,
#             padding=True,
#             return_tensors="pt",
#         )

#         with torch.no_grad():
#             pooled = model.forward_utterance(
#                 enc["input_ids"].to(_device),
#                 enc["attention_mask"].to(_device),
#             )

#             seq = pooled.unsqueeze(0)
#             lengths = [pooled.size(0)]

#             _, logit = model.forward_session(seq, lengths)
#             prob = float(torch.sigmoid(logit).cpu().item())
#             print(f"[WEEKLY ANALYSIS] LSTM session score: {prob:.4f}")

#         # Standard thresholds for LSTM
#         if prob < 0.45:
#             risk = "Low"
#         elif prob < 0.70:
#             risk = "Moderate"
#         else:
#             risk = "Elevated"
            
#     else:
#         # === APPROACH 2: Per-Utterance Averaging (for short sequences) ===
#         individual_scores = []
        
#         with torch.no_grad():
#             for idx, reflection in enumerate(reflections):
#                 enc = tokenizer(
#                     reflection,
#                     truncation=True,
#                     max_length=ModelConfig.DAIC_MAX_SEQ_LEN,
#                     padding=True,
#                     return_tensors="pt",
#                 )
                
#                 pooled = model.forward_utterance(
#                     enc["input_ids"].to(_device),
#                     enc["attention_mask"].to(_device),
#                 )
                
#                 logit = model.phq_bin_head(pooled).squeeze(-1)
#                 prob = float(torch.sigmoid(logit).cpu().item())
#                 individual_scores.append(prob)
#                 print(f"  Reflection {idx+1}: score={prob:.4f} - {reflection[:50]}...")
        
#         prob = sum(individual_scores) / len(individual_scores)
#         print(f"[WEEKLY ANALYSIS] Average score: {prob:.4f} (range: {min(individual_scores):.4f}-{max(individual_scores):.4f})")

#         # More conservative thresholds for short sequences
#         if prob < 0.35:
#             risk = "Low"
#         elif prob < 0.55:
#             risk = "Moderate"
#         else:
#             risk = "Elevated"
    
#     print(f"[WEEKLY ANALYSIS] Initial risk classification: {risk}")
    
#     # Apply sentiment-based correction for false positives
#     risk, prob = _analyze_sentiment_override(reflections, risk, prob)
    
#     print(f"[WEEKLY ANALYSIS] Final risk classification: {risk}, score: {prob:.4f}")

#     return {"weekly_risk_level": risk, "risk_score": round(prob, 4)}


# def forward_session(self, utter_embs_padded, lengths):
    #     packed = torch.nn.utils.rnn.pack_padded_sequence(
    #         utter_embs_padded, lengths=lengths, batch_first=True, enforce_sorted=True
    #     )
    #     _, (h_n, _) = self.aggr_lstm(packed)

    #     last_forward = h_n[-2]
    #     last_backward = h_n[-1]
    #     session_repr = torch.cat([last_forward, last_backward], dim=-1)

    #     phq_reg = self.session_phq_reg(session_repr).squeeze(-1)
    #     phq_bin_logit = self.session_phq_bin(session_repr).squeeze(-1)
    #     return phq_reg, phq_bin_logit
