import json
import statistics

def compute_ema_summary(ema_entries):

    if not ema_entries:
        return {
            "weekly_avg_depression": None,
            "weekly_avg_sleep": None,
            "trend_depression": "No Data",
            "trend_sleep": "No Data",
            "adherence_percent": 0,
            "clinical_interpretation": "No EMA data available."
        }

    # Sort by date ascending (important for trend)
    ema_entries = sorted(ema_entries, key=lambda x: x.date_submitted)

    depression_scores = []
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
        sleep_scores.append(q6)

    weekly_avg_depression = round(statistics.mean(depression_scores), 2)
    weekly_avg_sleep = round(statistics.mean(sleep_scores), 2)

    # --- Trend Detection ---
    first_dep = depression_scores[0]
    last_dep = depression_scores[-1]

    if last_dep < first_dep:
        trend_dep = "Improving"
    elif last_dep > first_dep:
        trend_dep = "Worsening"
    else:
        trend_dep = "Stable"

    first_sleep = sleep_scores[0]
    last_sleep = sleep_scores[-1]

    if last_sleep > first_sleep:
        trend_sleep = "Improving"
    elif last_sleep < first_sleep:
        trend_sleep = "Worsening"
    else:
        trend_sleep = "Stable"

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
        f"Weekly average depression index is {weekly_avg_depression}, "
        f"indicating {severity}. Symptom trajectory appears {trend_dep.lower()}. "
        f"Average sleep quality was {weekly_avg_sleep}, with sleep trend {trend_sleep.lower()}."
    )

    return {
        "weekly_avg_depression": weekly_avg_depression,
        "weekly_avg_sleep": weekly_avg_sleep,
        "trend_depression": trend_dep,
        "trend_sleep": trend_sleep,
        "adherence_percent": round(len(ema_entries) / 14 * 100, 1),
        "clinical_interpretation": clinical_note
    }

# import statistics

# def compute_ema_summary(ema_entries):
#     if not ema_entries:
#         return {
#             "mean_ema_score": None,
#             "sd_ema_score": None,
#             "adherence": 0
#         }

#     daily_scores = []

#     for e in ema_entries:
#         responses = e.responses or {}

#         values = [
#             responses.get("1"),
#             responses.get("2"),
#             responses.get("3"),
#             responses.get("4"),
#         ]

#         # Filter out None values safely
#         values = [v for v in values if isinstance(v, (int, float))]

#         if values:
#             daily_score = statistics.mean(values)
#             daily_scores.append(daily_score)

#     if not daily_scores:
#         return {
#             "mean_ema_score": None,
#             "sd_ema_score": None,
#             "adherence": round(len(ema_entries) / 14 * 100, 1)
#         }

#     return {
#         "mean_ema_score": round(statistics.mean(daily_scores), 2),
#         "sd_ema_score": round(statistics.stdev(daily_scores), 2) if len(daily_scores) > 1 else 0,
#         "adherence": round(len(ema_entries) / 14 * 100, 1)
#     }