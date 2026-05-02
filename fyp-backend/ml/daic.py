from __future__ import annotations

from sqlalchemy import text
import torch
import torch.nn as nn
from transformers import AutoTokenizer, DistilBertModel
from .config import ModelConfig
from .goemotions import predict_emotion
from torch.nn.utils.rnn import pad_packed_sequence

import re

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
    r"\bi feel trapped\b"
]

# CRITICAL: Patterns indicating immediate crisis/self-harm intent
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
    r"\bwish (i )?(i )?(wouldn'?t|didn'?t) wake up\b",
    r"\bwish (i )?(i )?was dead\b",
    r"\bbetter off if (i )?was dead\b",
    r"\bi'?d be better off dead\b",
    r"\bi don'?t want to wake up\b",
    r"\bi don'?t care if i die\b",
    r"\bi hope i die\b",
    r"\bi want to disappear forever\b",
    r"\beveryone would be better off without me\b",
    r"\bi am a burden\b",
    r"\bwish (i )?(i )?(wouldn’?t|didn'?t) wake up\b",
    r"\bwish (i )?(i )?(wouldn'?t|didn'?t) wake up\b",
    r"\bsometimes I wish I would not wake up\b",
    r"\bwish (i )?(would|could)? ?(not )?wake up\b",
r"\bwish (i )?(was|were)? ?dead\b",
r"\bi wish i (didn'?t|did not) exist\b",


]

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
            nn.Linear(enc_dim // 2, ModelConfig.DAIC_EMOTION_NUM_LABELS),  # ✅ From config
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

        # Session aggregator (BiLSTM)
        self.aggr_lstm = nn.LSTM(
            input_size=enc_dim,
            hidden_size=ModelConfig.DAIC_AGGR_HIDDEN,      # ✅ From config
            num_layers=ModelConfig.DAIC_AGGR_LAYERS,       # ✅ From config
            batch_first=True,
            bidirectional=True,
            dropout=ModelConfig.DAIC_AGGR_DROPOUT if ModelConfig.DAIC_AGGR_LAYERS > 1 else 0.0,  # ✅
        )

        self.session_phq_reg = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1)  # ✅ From config
        )
        self.session_phq_bin = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1)  # ✅ From config
        )

    def forward_utterance(self, input_ids, attention_mask):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask, return_dict=True)
        last = out.last_hidden_state
        pooled = last[:, 0, :]
        return pooled
    

    def forward_session(self, utter_embs_padded, lengths):
        packed = torch.nn.utils.rnn.pack_padded_sequence(
            utter_embs_padded,
            lengths=lengths,
            batch_first=True,
            enforce_sorted=False  # safer
        )

        packed_output, _ = self.aggr_lstm(packed)

        padded_output, _ = pad_packed_sequence(
            packed_output,
            batch_first=True
        )

        # Mean pooling across time dimension
        session_repr = padded_output.mean(dim=1)

        phq_reg = self.session_phq_reg(session_repr).squeeze(-1)
        phq_bin_logit = self.session_phq_bin(session_repr).squeeze(-1)

        return phq_reg, phq_bin_logit

    

_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() and ModelConfig.ENABLE_GPU else "cpu")  # ✅


def _split_into_utterances(text: str):
    parts = [p.strip() for p in re.split(r"[.\n!?]+", text) if p.strip()]
    return parts[:ModelConfig.DAIC_MAX_UTTERANCES] if parts else [text.strip()]  # ✅


def contains_high_risk_phrase(text: str) -> bool:
    text_lower = text.lower()
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False

NEGATION_WINDOW = [
    r"\b(not|no longer|never|don't|won't|wouldn't|didn't)\b",
    r"\b(i\s+)?(don't think|do not think)\b",
    r"\b(i\s+)?guess\b.{0,20}\b(won't|will not)\b",
]

def contains_crisis_content(text: str) -> bool:
    text_lower = text.lower()
    for pattern in CRISIS_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            window = text_lower[max(0, match.start() - 100):match.start()]
            negated = any(re.search(p, window) for p in NEGATION_WINDOW)
            if not negated:
                return True
    return False

def check_reflections_for_crisis(reflections: list[str]) -> tuple[bool, list[str], list[str]]:
    crisis_found = False
    crisis_reflections = []      # formatted labels for logging
    crisis_texts = []            # original full text for recovery check

    for idx, reflection in enumerate(reflections):
        if contains_crisis_content(reflection):
            crisis_found = True
            crisis_reflections.append(f"Reflection {idx+1}: {reflection[:100]}...")
            crisis_texts.append(reflection)   # ← store full original

    return crisis_found, crisis_reflections, crisis_texts


def escalate_one_level(risk: str) -> str:
    if risk == "Low":
        return "Moderate"
    elif risk == "Moderate":
        return "Elevated"
    return risk  

def load_daic():
    global _tokenizer, _model

    if _model is not None and _tokenizer is not None:
        return _tokenizer, _model

    if not ModelConfig.DAIC_CHECKPOINT.exists():  # ✅
        raise FileNotFoundError(f"DAIC checkpoint not found: {ModelConfig.DAIC_CHECKPOINT}")

    if not ModelConfig.DAIC_TOKENIZER_DIR.exists():  # ✅
        raise FileNotFoundError(f"Tokenizer directory not found: {ModelConfig.DAIC_TOKENIZER_DIR}")

    tok = AutoTokenizer.from_pretrained(str(ModelConfig.DAIC_TOKENIZER_DIR))  # ✅
    model = DistilBertMultiTaskWithAggregator(encoder_ckpt=str(ModelConfig.DAIC_TOKENIZER_DIR))  # ✅

    state_dict = torch.load(str(ModelConfig.DAIC_CHECKPOINT), map_location="cpu")  # ✅
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    model.to(_device)

    _tokenizer, _model = tok, model
    return _tokenizer, _model




def predict_daic_session(text: str):
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty text")

    # CHANGE 1: removed the early crisis regex block that was here.
    # WHY: it short-circuited ML entirely, returning Elevated 0.95
    # for "I am NOT going to kill myself" — ML never got to run.

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
        scaled_logit = logit / temperature
        prob = float(torch.sigmoid(scaled_logit).cpu().item())

    # ---- Emotion prediction — unchanged ----
    emotion_result = predict_emotion(text)
    primary_emotion = emotion_result.get("primary_emotion", "").lower()
    dominant_emotions = emotion_result.get("dominant_emotions", [])
    final_emotion = primary_emotion

    # ---- Neutral dampener — unchanged ----
    if primary_emotion == "neutral" and not contains_high_risk_phrase(text):
        prob *= 0.75

    print(f"[SESSION ANALYSIS] Text: '{text}' | DAIC probability: {prob:.4f}")

    # ---- Thresholds — unchanged ----
    if prob < 0.45:
        risk = "Low"
    elif prob < 0.75:
        risk = "Moderate"
    else:
        risk = "Elevated"

    

    # CHANGE 2: cache text_lower once here for all regex below.
    # WHY: avoids calling .lower() repeatedly in every check.
    text_lower = text.lower()


    # Precompute flags
    crisis = contains_crisis_content(text)
    ambiguous = any(re.search(p, text_lower) for p in AMBIGUOUS)
    passive = any(re.search(p, text_lower) for p in PASSIVE_RISK)

    escalation_used = False

    if crisis and not escalation_used:
        risk = escalate_one_level(risk)
        escalation_used = True

    elif ambiguous and prob > 0.45 and not escalation_used:
        risk = escalate_one_level(risk)
        escalation_used = True

    elif passive and prob > 0.55 and not escalation_used:
        risk = escalate_one_level(risk)
        escalation_used = True

    # ---- High-risk phrase escalation — unchanged logic, same position ----
    elif prob > 0.65 and contains_high_risk_phrase(text) and not escalation_used:
        print("HIGH RISK PHRASE detected")
        risk = escalate_one_level(risk)
        final_emotion = "distress"
        escalation_used = True

    if risk == "Elevated":
        if prob < 0.65 and not crisis:
            if any(word in text_lower for word in ["empty", "meaningless", "pointless"]):
                risk = "Moderate"

    



    
    # CHANGE 6: recovery narrative dampener — new.
    # WHY: "I used to want to kill myself but now I'm fine"
    # still triggers ML at Elevated because of the crisis vocabulary.
    # If clear past-tense + recovery signals exist, downgrade one level.
    if risk == "Elevated" and any(re.search(p, text_lower) for p in RECOVERY_SIGNALS):
        risk = "Moderate"

    # ---- Surprise correction — unchanged ----
    if final_emotion != "distress":
        if primary_emotion == "surprise" and prob > 0.60:
            if "sadness" in dominant_emotions:
                final_emotion = "sadness"
            else:
                final_emotion = "distress"

    POSITIVE = ["enjoy", "peace", "happy", "fine", "okay", "grateful"]

    if any(word in text_lower for word in POSITIVE):
        if risk == "Moderate" and prob < 0.6:
            risk = "Low"

    return {
        "risk_level": risk,
        "risk_score": round(prob, 4),
        "emotion": final_emotion
    }


def predict_daic_weekly(reflections: list[str]):

    reflections = [r.strip() for r in reflections if r.strip()]
    reflections = reflections[-30:]

    if len(reflections) < 3:
        return {"weekly_risk_level": "Insufficient Data"}

    # 1️⃣ Crisis Override
    has_crisis, crisis_reflections, crisis_texts = check_reflections_for_crisis(reflections)
    if has_crisis:
        all_recovery = all(
            any(re.search(p, r.lower()) for p in RECOVERY_SIGNALS)
            for r in crisis_texts    # ← use full text, no prefix, no truncation
        )
        if not all_recovery:
            return {
                "weekly_risk_level": "Elevated",
                "risk_score": 0.95,
                "crisis_detected": True,
                "crisis_count": len(crisis_reflections),
                "explanation": ["Crisis phrases detected"]
            }
        # If all were recovery narratives, fall through to ML scoring

    tokenizer, model = load_daic()

    scores = []
    emotions = []

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

            # ✅ Temperature scaling (consistent with session)
            scaled = logit / 1.8
            prob_i = float(torch.sigmoid(scaled).cpu().item())

            scores.append(prob_i)

            emotion = predict_emotion(reflection).get(
                "primary_emotion", ""
            ).lower()

            emotions.append(emotion)

    # 2️⃣ Core Aggregation
    prob_mean = sum(scores) / len(scores)
    prob_max = max(scores)
    prob_recent = scores[-1]

    prob = (
        0.5 * prob_recent +
        0.3 * prob_mean +
        0.2 * prob_max
    )

    explanation_flags = []

    if prob_max > 0.90:
        prob = max(prob, 0.80)
        explanation_flags.append("Severe reflection spike detected")
    elif prob_max > 0.80:
        prob = max(prob, 0.70)
        explanation_flags.append("High-risk reflection spike detected")


    # 3️⃣ Robust Trend Detection
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

    # 4️⃣ Sentiment Modulation (Conservative)
    POSITIVE = {'joy','love','gratitude','admiration','excitement',
                'optimism','amusement','pride','approval','caring',
                'desire','relief'}

    NEGATIVE = {'sadness','anger','fear','grief','disappointment',
                'disgust','annoyance','nervousness','embarrassment','remorse'}

    total = len(emotions)
    positive_ratio = sum(e in POSITIVE for e in emotions) / total
    negative_ratio = sum(e in NEGATIVE for e in emotions) / total

    if negative_ratio >= 0.70:
        prob += 0.07
        explanation_flags.append("Predominantly negative tone")

    # Very mild dampening only if clearly safe zone
    if positive_ratio >= 0.75 and prob < 0.50:
        prob *= 0.95
        explanation_flags.append("Predominantly positive tone")

    # 5️⃣ Data Strength Weighting
    data_strength = min(len(reflections) / 30, 1.0)
    prob *= (0.85 + 0.15 * data_strength)

    # 6️⃣ Clamp
    prob = max(0.0, min(1.0, prob))

    # 7️⃣ Stable Risk Bands (consistent everywhere)
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
        "crisis_detected": False
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
