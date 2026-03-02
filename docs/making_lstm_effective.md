# Making LSTM Aggregator Effective

## The Problem

**DAIC-WOZ LSTM Training:**
- Trained on 80-120 utterances per clinical interview
- Conversational structure (interviewer ↔️ patient)
- Long temporal context

**Your Current Data:**
- 3-7 reflections per week
- Standalone reflections (no conversation)
- Short sequences

**Result:** LSTM operates outside training distribution → unpredictable outputs

---

## Solutions to Make LSTM Effective

### ✅ **Option 1: Adaptive Approach** (Already Implemented)

The code now **automatically chooses** the best method:

```python
def predict_daic_weekly(reflections, use_lstm_threshold=20):
    if len(reflections) < 20:
        # Use per-utterance averaging
        for reflection in reflections:
            score = model.phq_bin_head(embedding)
        avg_score = mean(scores)
    else:
        # Use LSTM aggregator (enough data!)
        session_repr = model.forward_session(embeddings, lengths)
        score = session_bin_head(session_repr)
```

**When LSTM Activates:**
- ≥ 20 reflections → LSTM aggregator used
- < 20 reflections → Per-utterance averaging

---

### ✅ **Option 2: Increase Data Collection** (Recommended)

**Change frontend to collect MORE reflections per week:**

#### Current:
- 1 reflection/day × 7 days = **7 reflections** ❌ Too few for LSTM

#### Recommended:
- **Morning:** "How did you sleep? How do you feel this morning?"
- **Midday:** "How's your day going so far?"
- **Evening:** "Reflect on your day. What happened? How do you feel now?"

**Result:** 3 reflections/day × 7 days = **21 reflections** ✅ LSTM can work!

---

### ✅ **Option 3: Rolling Window (30+ Days)** (Already Implemented)

Use `generate_for_user_rolling()` instead of standard 7-day window:

**Backend (already implemented):**
```python
# In report.py
@router.get("/weekly-text-risk-rolling")
def get_monthly_text_risk(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    weekly_service = get_weekly_service()
    result = weekly_service.generate_for_user_rolling(db, session_id, days=30)
    return result
```

**Benefits:**
- 30 days × 1 reflection/day = 30 reflections (decent for LSTM)
- 30 days × 3 reflections/day = 90 reflections (OPTIMAL for LSTM!)
- Captures longer-term trends

---

### ✅ **Option 4: Hybrid Approach**

Combine short-term (7 days) + long-term (30 days) analysis:

```python
# Short-term (7 days): Use per-utterance averaging
short_term = weekly_service.generate_for_user(db, user_id)

# Long-term (30 days): Use LSTM if enough data
long_term = weekly_service.generate_for_user_rolling(db, user_id, days=30)

return {
    "current_week": short_term,
    "monthly_trend": long_term  # Uses LSTM if >= 20 reflections
}
```

---

## Summary Table

| Approach | Reflections Needed | LSTM Used? | Implementation Status |
|----------|-------------------|------------|----------------------|
| **Current (7 days)** | 3-7 | ❌ No | ✅ Uses per-utterance |
| **Adaptive** | Auto-switches at 20 | ✅ Yes if ≥20 | ✅ Implemented |
| **More frequent collection** | 15-21/week | ✅ Yes | ⏳ Frontend change needed |
| **Rolling 30-day window** | 20-90 | ✅ Yes | ✅ Backend ready |
| **Hybrid (7d + 30d)** | Both | ✅ Yes for 30d | ⏳ Router change needed |

---

## Current Behavior

**With your 4 positive reflections:**
```
[WEEKLY ANALYSIS] Analyzing 4 reflections...
[WEEKLY ANALYSIS] Strategy: Per-Utterance Averaging  ← Not enough for LSTM

  Reflection 1: score=0.15 - I had an amazing day!
  Reflection 2: score=0.12 - Feeling great and motivated
  Reflection 3: score=0.18 - Spent quality time with loved ones
  Reflection 4: score=0.18 - Spent quality time with loved ones

[WEEKLY ANALYSIS] Average score: 0.158
[SENTIMENT ANALYSIS] Positive: 4/4 (100%), Negative: 0/4 (0%)
[SENTIMENT OVERRIDE] Strong positive sentiment. Adjusting score: 0.158 → 0.111
[WEEKLY ANALYSIS] Final: Low, score: 0.111 ✅
```

**When you have 25 reflections (future):**
```
[WEEKLY ANALYSIS] Analyzing 25 reflections...
[WEEKLY ANALYSIS] Strategy: LSTM Aggregator  ← Enough data!

[WEEKLY ANALYSIS] LSTM session score: 0.275
[WEEKLY ANALYSIS] Final: Low, score: 0.275 ✅
```

---

## Recommendation

**Option: Increase collection frequency** ⭐
- Ask users for 2-3 reflections per day
- LSTM becomes effective after ~2 weeks (14-21 reflections)
- Better clinical insights from longer sequences

**Implementation:**
1. Update frontend EMA prompts (add morning/evening checks)
2. Use rolling 14-day window instead of 7
3. LSTM automatically activates when threshold reached
