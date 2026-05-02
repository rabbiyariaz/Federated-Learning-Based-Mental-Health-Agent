# PHQ-8 and EMA: Their Roles Together

## Overview

PHQ-8 (baseline + follow-ups) and EMA (daily check-ins) are two complementary assessment tools in the mental health monitoring system.

---

## PHQ-8: Baseline & Trend Assessment

### Purpose
- **Baseline (Day 0)**: Captures overall depressive severity at study entry
- **Follow-up (≥ 7 days apart)**: Measures how symptoms change over time

### When Used
- Initial screening (required to start study)
- Periodic check-ins (≥ 7 days after baseline)

### What It Measures
8-item assessment covering:
1. Depressed mood
2. Loss of interest/pleasure
3. Sleep disturbance
4. Fatigue/low energy
5. Appetite changes
6. Self-worth/guilt
7. Concentration problems
8. Suicidal ideation

### Output
- **Total Score**: 0-24 (higher = more severe)
- **Severity Level**: Minimal, Mild, Moderate, Moderately Severe, Severe
- **Trend Analysis**: Compare previous PHQ scores to track improvement/worsening

---

## EMA: Daily Fluctuation & Real-Time Data

### Purpose
- Capture **daily mood variability** in the user's natural environment
- Track moment-to-moment symptom fluctuations (not just overall severity)
- Provide rich temporal data for machine learning models

### When Used
- **Once per day**, every day (or as many days as user engages)
- Typically collected for 7, 14, or 30 days

### What It Measures
6 quick questions (~ 1-2 minutes):
1. Sadness/hopelessness (0-4)
2. Reduced pleasure/interest (0-4)
3. Fatigue/low energy (0-4)
4. Negative thoughts about self (0-4)
5. Racing thoughts OR restlessness (0-4) + severity (0-4)
6. Sleep quality (0-4)

### Output
- **Daily response set**: Stored for each day
- **7-Day Summary**: When 7 or more daily inputs exist
  - Average depression score
  - Mood variability (standard deviation)
  - Trend direction (improving/stable/worsening)

---

## How They Work Together

| Aspect | PHQ-8 | EMA | Combined Purpose |
|--------|-------|-----|-----------------|
| **Frequency** | Baseline + follow-ups (≥7 days apart) | Daily | Understand both overall severity AND daily fluctuations |
| **Time Scale** | Asks about "past 2 weeks" | Asks about "today only" | Macro (2 weeks) + Micro (1 day) |
| **Sample Size** | Usually 1-3 PHQ scores over study | 7-30+ daily EMA entries | PHQ = sparse but comprehensive; EMA = dense but focused |
| **Use in Report** | **Trend Analysis**: Show if user improving/worsening | **7-Day Summary**: Show recent mood patterns | Report shows both LONG-TERM trends + SHORT-TERM fluctuations |
| **ML Model Input** | Used for baseline severity classification | Fed into LSTM aggregator for weekly risk assessment | PHQ for stratification; EMA + text for weekly prediction |

---

## Example Flow

**Week 1:**
1. User submits **PHQ-8 baseline** (score: 18 = Moderate depression)
2. User submits **EMA daily** (Days 1-7)
   - Day 1: Mood 3, Interest 2, Energy 3...
   - Day 2: Mood 2, Interest 1, Energy 2...
   - ...
   - Day 7: Mood 2, Interest 3, Energy 1...

**Report Generated After Day 7:**
- **PHQ Progress**: "Baseline severity: Moderate (18/24)"
- **EMA 7-Day Summary**:
  - Avg Depression: 2.4/4
  - Mood Variability: SD = 0.52
  - Trend: Stable
- **Text Risk Assessment** (if 3+ reflections): "Low risk"

**Week 2:**
1. User submits **PHQ-8 follow-up** on Day 9 (score: 14 = Mild depression)
   - **Change**: -4 points = "No major change" but trending better
   - **Days between**: 9 days ✓ Valid for trend comparison
2. User continues **EMA daily** (Days 8-14)
   - New 7-day window resets to Days 8-14

**Updated Report:**
- **PHQ Trend**: "Improvement from Moderate (18) → Mild (14). Good progress! 🎉"
- **Latest 7-Day EMA** (Days 8-14):
  - Avg Depression: 2.1/4 (further improvement)
  - Mood Variability: SD = 0.48 (more stable)
  - Trend: Improving ✓

---

## Why Both Are Needed

| Scenario | PHQ-8 Shows | EMA Shows | Clinical Value |
|----------|------------|-----------|-----------------|
| **User has stable depression** | Same score over time | Minimal daily fluctuation | ✓ Consistent, predictable pattern |
| **User has high variability** | Moderate overall score | High SD in daily scores | ⚠️ Mood swings; needs monitoring |
| **User improving** | PHQ score decreasing | Daily averages trending down | ✓ Confirms improvement is sustained |
| **User has a bad day** | PHQ unchanged | One high EMA score | 💡 Isolated bad day, not overall worsening |

---

## Data Flow in Reports

```
┌─ PHQ-8 Baseline
│  └─ Calculate: Total Score, Severity Level
├─ PHQ Follow-ups (≥7 days apart)
│  └─ Calculate: Change, Trend, Status
│
├─ EMA Daily Submissions
│  └─ Store: responses, date
│
├─ 7-Day Window (Last 7 Calendar Days)
│  └─ Fetch: EMA entries in last 7 days
│     ├─ Count: ema_days_completed (0-7)
│     ├─ Compute: Avg depression, Mood variability, Trend
│     └─ Output: 7-Day EMA Summary
│
├─ Text Reflections (Last 7 Days)
│  └─ Fetch: Text entries from last 7 days
│     ├─ Count: reflection_count
│     ├─ Aggregate: LSTM model processes all reflections
│     └─ Output: weekly_risk_level (Low/Moderate/Elevated)
│
└─ Final Report
   ├─ Latest PHQ Score & Severity
   ├─ PHQ Progress (if ≥2 PHQs)
   ├─ PHQ Trend (all valid PHQs)
   ├─ 7-Day EMA Summary
   └─ Weekly Text Risk Assessment
```

---

## FAQ

**Q: Why is the EMA window 7 days but PHQ requires ≥7 days apart?**
A: EMA captures daily state (you need recent data), PHQ measures change over time (you need sufficient gap to see real change). A PHQ taken 6 days after another is too close.

**Q: Can a user submit EMA after a new PHQ?**
A: Yes! The 7-day window always rolls forward. After new PHQ, the window calculates 7 days from TODAY regardless of when PHQ was taken.

**Q: What if user only submits 3 EMAs in a week?**
A: Report shows 3/7 days. All available data is included in summaries (completeness shows in % adherence). Weekly text risk still available if 3+ reflections.

**Q: Does PHQ reset the EMA count?**
A: No. EMA is always measured as "last 7 calendar days". A new PHQ doesn't reset the counter.
