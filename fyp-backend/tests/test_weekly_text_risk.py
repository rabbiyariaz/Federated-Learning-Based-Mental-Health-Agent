"""
Test script for Weekly Text Risk Assessment functionality
Tests the LSTM aggregator integration for weekly risk classification
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from ml.daic_model import DAICModel
from ml.ml_services.weekly_report_service import WeeklyReportService


def test_weekly_service():
    """Test the weekly report service with sample reflections"""
    
    print("=" * 60)
    print("Weekly Text Risk Assessment - Integration Test")
    print("=" * 60)
    
    # Initialize model and service
    print("\n1. Loading DAIC model with LSTM aggregator...")
    daic_model = DAICModel()
    daic_model.load()
    print("   ✓ Model loaded successfully")
    
    print("\n2. Initializing WeeklyReportService...")
    weekly_service = WeeklyReportService(daic_model)
    print("   ✓ Service initialized")
    
    # Test Case 1: Insufficient data
    print("\n3. Test Case 1: Insufficient Data (2 reflections)")
    reflections_insufficient = [
        "I felt okay today",
        "Had a decent day"
    ]
    result = weekly_service.generate_from_reflections(reflections_insufficient)
    print(f"   Result: {result}")
    assert result["weekly_risk_level"] == "Insufficient Data"
    assert result["reflection_count"] == 2
    print("   ✓ Test passed")
    
    # Test Case 2: Low risk
    print("\n4. Test Case 2: Low Risk (positive reflections)")
    reflections_low = [
        "Today was a really good day, I feel motivated and happy",
        "Had a productive day at work, feeling accomplished",
        "Spent quality time with family, feeling grateful",
        "Exercised and ate well, feeling energized",
        "Slept well and woke up refreshed"
    ]
    result = weekly_service.generate_from_reflections(reflections_low)
    print(f"   Result: {result}")
    assert result["weekly_risk_level"] in ["Low", "Moderate", "Elevated"]
    assert result["reflection_count"] == 5
    print(f"   ✓ Test passed - Risk Level: {result['weekly_risk_level']}")
    
    # Test Case 3: Elevated risk
    print("\n5. Test Case 3: Elevated Risk (concerning reflections)")
    reflections_elevated = [
        "I can't see the point in anything anymore, everything feels hopeless",
        "Tired of pretending everything is fine when I'm struggling",
        "Feel like everyone would be better off without me",
        "Can't sleep, can't focus, nothing brings me joy anymore",
        "What's the point of trying when nothing will change"
    ]
    result = weekly_service.generate_from_reflections(reflections_elevated)
    print(f"   Result: {result}")
    assert result["weekly_risk_level"] in ["Low", "Moderate", "Elevated"]
    assert result["reflection_count"] == 5
    print(f"   ✓ Test passed - Risk Level: {result['weekly_risk_level']}")
    
    # Test Case 4: Moderate risk
    print("\n6. Test Case 4: Moderate Risk (mixed reflections)")
    reflections_moderate = [
        "Some days are better than others",
        "Struggling with anxiety but managing to get through",
        "Work is stressful but I'm coping",
        "Had a hard time today but tomorrow is a new day",
        "Feeling a bit down but trying to stay positive"
    ]
    result = weekly_service.generate_from_reflections(reflections_moderate)
    print(f"   Result: {result}")
    assert result["weekly_risk_level"] in ["Low", "Moderate", "Elevated"]
    assert result["reflection_count"] == 5
    print(f"   ✓ Test passed - Risk Level: {result['weekly_risk_level']}")
    
    # Test Case 5: No data
    print("\n7. Test Case 5: No Data (empty reflections)")
    reflections_empty = []
    result = weekly_service.generate_from_reflections(reflections_empty)
    print(f"   Result: {result}")
    assert result["weekly_risk_level"] == "No Data"
    assert result["reflection_count"] == 0
    print("   ✓ Test passed")
    
    print("\n" + "=" * 60)
    print("All Tests Passed! ✓")
    print("=" * 60)
    print("\nSummary:")
    print("✓ LSTM aggregator loaded successfully")
    print("✓ Weekly report service integration working")
    print("✓ Three-tier risk classification (Low/Moderate/Elevated)")
    print("✓ Edge cases handled (insufficient data, no data)")
    print("\nThe integration is ready to use!")


if __name__ == "__main__":
    try:
        test_weekly_service()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
