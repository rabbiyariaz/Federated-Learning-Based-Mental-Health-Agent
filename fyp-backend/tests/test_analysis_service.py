from datetime import date, timedelta
from app.services.analysis_service import (
    compute_ema_summary,
    compute_phq_progress,
    generate_weekly_report
)
from app.models import EMAEntry, PHQAssessment


def test_compute_ema_summary_valid():
    """Test EMA summary computation with valid data"""
    today = date.today()
    mock_entries = []
    
    for i in range(7):
        entry = EMAEntry(
            user_id="test-user",
            date_submitted=today - timedelta(days=i),
            responses={
                "1": 2 + i % 3,  # Depression
                "2": 2 + i % 3,  # Anxiety
                "3": 3,          # Sleep quality
                "4": 2,          # Sleep duration
                "5_severity": 3,
                "5_type": "My mind was frequently occupied by racing or negative thoughtss",
                "6": 3 + i % 2   # Energy
            }
        )
        mock_entries.append(entry)
    
    result = compute_ema_summary(mock_entries)
    
    assert "weekly_avg_depression" in result
    assert "weekly_avg_sleep" in result
    assert "trend_depression" in result
    assert "trend_sleep" in result
    assert "clinical_interpretation" in result
    
    assert result["weekly_avg_depression"] >= 0
    assert result["weekly_avg_sleep"] >= 0
    assert result["trend_depression"] in ["Improving", "Worsening", "Stable"]


def test_compute_ema_summary_empty():
    """Test EMA summary with no entries"""
    result = compute_ema_summary([])
    
    assert result["weekly_avg_depression"] == 0
    assert result["weekly_avg_sleep"] == 0
    assert result["trend_depression"] == "No data"


def test_compute_ema_summary_single_entry():
    """Test EMA summary with single entry"""
    entry = EMAEntry(
        user_id="test-user",
        date_submitted=date.today(),
        responses={
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    )
    
    result = compute_ema_summary([entry])
    
    assert result["weekly_avg_depression"] >= 0
    assert "trend_depression" in result


def test_compute_ema_summary_invalid_responses():
    """Test EMA summary computation with invalid response values"""
    entry = EMAEntry(
        user_id="test-user",
        date_submitted=date.today(),
        responses={
            "1": 5,  # Invalid value (should be 0-3)
            "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "normal", "6": 3
        }
    )
    
    result = compute_ema_summary([entry])
    
    # Should handle invalid values gracefully
    assert isinstance(result, dict)


def test_generate_weekly_report():
    """Test generating weekly report"""
    user_id = "test-user"
    
    # Create mock EMA entries
    ema_entries = []
    for i in range(7):
        entry = EMAEntry(
            user_id=user_id,
            date_submitted=date.today() - timedelta(days=i),
            responses={
                "1": 2, "2": 2, "3": 3, "4": 2,
                "5_severity": 2, "5_type": "normal", "6": 3
            }
        )
        ema_entries.append(entry)
    
    ema_summary = compute_ema_summary(ema_entries)
    result = generate_weekly_report(user_id, ema_summary)
    
    assert "user_id" in result
    assert "week_summary" in result
    assert "recommendations" in result
    
    
    assert result["user_id"] == user_id


def test_analysis_with_missing_data():
    """Test analysis handles missing data gracefully"""
    # Create entries with some missing fields
    entry = EMAEntry(
        user_id="test-user",
        date_submitted=date.today(),
        responses={"1": 2}  # Incomplete responses
    )
    
    result = compute_ema_summary([entry])
    
    # Should not crash and return valid structure
    assert isinstance(result, dict)


def test_trend_calculation_improving():
    """Test trend calculation detects improvement"""
    entries = []
    for i in range(7):
        score = 4 - (i * 0.5)  # Decreasing depression score
        entry = EMAEntry(
            user_id="test-user",
            date_submitted=date.today() - timedelta(days=6-i),
            responses={
                "1": max(1, int(score)), "2": 2, "3": 3, "4": 2,
                "5_severity": 2, "5_type": "normal", "6": 3
            }
        )
        entries.append(entry)
    
    result = compute_ema_summary(entries)
    
    # Trend should indicate improvement
    assert result["trend_depression"] in ["Improving", "Stable"]


def test_trend_calculation_worsening():
    """Test trend calculation detects worsening"""
    entries = []
    for i in range(7):
        score = 1 + (i * 0.5)  # Increasing depression score
        entry = EMAEntry(
            user_id="test-user",
            date_submitted=date.today() - timedelta(days=6-i),
            responses={
                "1": min(5, int(score)), "2": 2, "3": 3, "4": 2,
                "5_severity": 2, "5_type": "normal", "6": 3
            }
        )
        entries.append(entry)
    
    result = compute_ema_summary(entries)
    
    # Trend should indicate worsening
    assert result["trend_depression"] in ["Worsening", "Stable"]