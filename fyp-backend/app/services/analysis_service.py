import statistics

def compute_ema_summary(ema_entries):

    if not ema_entries:
        return {
            "weekly_avg_depression": 0,
            "weekly_avg_anxiety": 0,
            "weekly_avg_sleep": 0,
            "mood_variability": 0,
            "trend_depression": "No data",
            "trend_sleep": "No data",
            "adherence_percent": 0,
            "clinical_interpretation": "No EMA data available."
        }

    # Ensure chronological order
    ema_entries = sorted(ema_entries, key=lambda x: x.date_submitted)

    depression_scores = []
    anxiety_scores = []
    sleep_scores = []

    for e in ema_entries:
        responses = e.responses or {}

        q1 = responses.get("1", 0)
        q2 = responses.get("2", 0)
        q3 = responses.get("3", 0)
        q4 = responses.get("4", 0)
        q5 = responses.get("5_severity", 0)
        q6 = responses.get("6", 0)

        daily_depression = q1 + q2 + q3 + q4 + q5

        depression_scores.append(daily_depression)
        anxiety_scores.append(q2)
        sleep_scores.append(q6)

    # --- Averages ---
    weekly_avg_depression = round(statistics.mean(depression_scores), 2)
    weekly_avg_anxiety = round(statistics.mean(anxiety_scores), 2)
    weekly_avg_sleep = round(statistics.mean(sleep_scores), 2)

    # --- Mood Variability (standard deviation) ---
    if len(depression_scores) > 1:
        mood_variability = round(statistics.stdev(depression_scores), 2)
    else:
        mood_variability = 0

    # --- Trend Detection (first half vs second half mean) ---
    if len(depression_scores) >= 4:
        mid = len(depression_scores) // 2
        first_half = depression_scores[:mid]
        second_half = depression_scores[mid:]

        trend_value = statistics.mean(second_half) - statistics.mean(first_half)

        if trend_value <= -1:
            trend_dep = "Improving"
        elif trend_value >= 1:
            trend_dep = "Worsening"
        else:
            trend_dep = "Stable"
    else:
        trend_dep = "Insufficient data"

    # --- Sleep Trend ---
    if len(sleep_scores) >= 4:
        mid = len(sleep_scores) // 2
        first_half = sleep_scores[:mid]
        second_half = sleep_scores[mid:]

        trend_value_sleep = statistics.mean(second_half) - statistics.mean(first_half)

        if trend_value_sleep >= 0.5:
            trend_sleep = "Improving"
        elif trend_value_sleep <= -0.5:
            trend_sleep = "Worsening"
        else:
            trend_sleep = "Stable"
    else:
        trend_sleep = "Insufficient data"

    # --- Adherence ---
    expected_days = 7
    adherence_percent = round(len(ema_entries) / expected_days * 100, 1)

    # --- Clinical Interpretation ---
    if weekly_avg_depression >= 18:
        severity = "High depressive symptom burden"
    elif weekly_avg_depression >= 12:
        severity = "Moderate depressive symptom burden"
    elif weekly_avg_depression >= 7:
        severity = "Mild depressive symptom burden"
    else:
        severity = "Minimal depressive symptom burden"

    clinical_note = (
        f"Weekly Depressive Symptom Intensity is {weekly_avg_depression}, "
        f"indicating {severity}. Mood variability is {mood_variability}. "
        f"Depressive Symptom Trend {trend_dep.lower()}. "
        f"Average sleep was {weekly_avg_sleep}, with sleep trend {trend_sleep.lower()}."
    )

    return {
        "weekly_avg_depression": weekly_avg_depression,
        "weekly_avg_anxiety": weekly_avg_anxiety,
        "weekly_avg_sleep": weekly_avg_sleep,
        "mood_variability": mood_variability,
        "trend_depression": trend_dep,
        "trend_sleep": trend_sleep,
        "adherence_percent": adherence_percent,
        "clinical_interpretation": clinical_note
    }
def compute_phq_progress(previous, current):

    gap_days = (current.submitted_at - previous.submitted_at).days

    if gap_days < 7:
        return None  # Not valid comparison

    delta = current.total_score - previous.total_score

    if delta <= -5:
        status = "Significant improvement"
    elif delta >= 5:
        status = "Significant worsening"
    else:
        status = "No major change"

    remission = current.total_score <= 5

    return {
        "previous_score": previous.total_score,
        "current_score": current.total_score,
        "change": delta,
        "status": status,
        "remission": remission,
        "days_between": gap_days
    }
def compute_phq_trend(phq_assessments):
    """
    Analyze overall PHQ trend across multiple assessments.
    Only includes PHQs that are ≥7 days apart.
    
    Args:
        phq_assessments: List of PHQAssessment objects (ordered chronologically)
    
    Returns:
        dict with trend analysis or None if insufficient data
    """
    if len(phq_assessments) < 2:
        return None
    
    # Sort by date (oldest first)
    sorted_phqs = sorted(phq_assessments, key=lambda x: x.submitted_at)
    
    # Filter for valid time intervals (≥7 days apart)
    valid_phqs = [sorted_phqs[0]]  # Always include first
    
    for phq in sorted_phqs[1:]:
        days_since_last = (phq.submitted_at - valid_phqs[-1].submitted_at).days
        if days_since_last >= 7:
            valid_phqs.append(phq)
    
    # Need at least 2 valid PHQs for trend
    if len(valid_phqs) < 2:
        return None
    
    scores = [phq.total_score for phq in valid_phqs]
    
    # Calculate overall change
    first_score = scores[0]
    last_score = scores[-1]
    total_change = last_score - first_score
    
    # Calculate average change per valid interval
    avg_change = total_change / (len(valid_phqs) - 1)
    
    # Determine trend direction
    if total_change <= -5:
        trend_direction = "Improving"
        trend_description = f"Score decreased by {abs(total_change)} points"
    elif total_change >= 5:
        trend_direction = "Worsening"
        trend_description = f"Score increased by {total_change} points"
    else:
        trend_direction = "Stable"
        trend_description = f"Score changed by {total_change:+d} points"
    
    # Detect pattern (if ≥3 valid PHQs)
    pattern = None
    if len(valid_phqs) >= 3:
        mid_idx = len(scores) // 2
        first_half_avg = statistics.mean(scores[:mid_idx+1])
        second_half_avg = statistics.mean(scores[mid_idx:])
        
        if first_half_avg > last_score and scores[0] > first_half_avg:
            pattern = "Consistent improvement"
        elif first_half_avg < last_score and scores[0] < first_half_avg:
            pattern = "Consistent worsening"
        elif scores[mid_idx] < first_score and scores[mid_idx] < last_score:
            pattern = "U-shaped (dip then recovery)"
        elif scores[mid_idx] > first_score and scores[mid_idx] > last_score:
            pattern = "Inverted U (spike then decline)"
    
    return {
        "num_assessments": len(valid_phqs),
        "first_score": first_score,
        "last_score": last_score,
        "total_change": total_change,
        "avg_change_per_interval": round(avg_change, 2),
        "trend_direction": trend_direction,
        "trend_description": trend_description,
        "pattern": pattern,
        "timespan_days": (valid_phqs[-1].submitted_at - valid_phqs[0].submitted_at).days
    }


def generate_weekly_report(user_id, ema_summary, phq_progress=None):

    recommendations = []
    relapse_flag = False

    # EMA-based signals
    if ema_summary["weekly_avg_depression"] >= 12:
        recommendations.append("Moderate depressive burden. Consider clinical review.")

    if ema_summary["trend_depression"] == "Worsening":
        recommendations.append("Depression trend worsening. Monitor closely.")

    if ema_summary["mood_variability"] >= 3:
        recommendations.append("High mood variability detected.")

    # PHQ-based signals
    if phq_progress:
        if phq_progress["status"] == "Significant worsening":
            recommendations.append("PHQ score significantly increased.")
            relapse_flag = True

        if phq_progress["remission"]:
            recommendations.append("Remission criteria met.")

    return {
        "user_id": user_id,
        "week_summary": ema_summary,
        "phq_progress": phq_progress,
        "relapse_flag": relapse_flag,
        "recommendations": recommendations
    }