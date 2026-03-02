from sqlalchemy.orm import Session
from typing import Dict, List
from .text_entry_service import get_user_reflections_last_7_days
from datetime import datetime, timedelta, timezone
from app.models import TextEntry


class WeeklyReportService:
    """
    Service to generate weekly risk assessment using LSTM aggregator.
    
    The LSTM aggregator processes multiple daily text reflections and 
    outputs one of three risk levels: Low, Moderate, or Elevated.
    """
    
    def __init__(self, daic_model):
        self.daic_model = daic_model

    def generate_from_reflections(self, reflections: List[str]) -> Dict:
        """
        Generate weekly risk assessment from a list of reflections.
        
        Args:
            reflections: List of text reflections (minimum 3 required)
            
        Returns:
            Dict containing weekly_risk_level (Low/Moderate/Elevated) 
            and additional metadata
        """
        if not reflections:
            return {
                "weekly_risk_level": "No Data",
                "risk_score": None,
                "reflection_count": 0,
                "message": "No reflections found for analysis"
            }
        
        if len(reflections) < 3:
            return {
                "weekly_risk_level": "Insufficient Data",
                "risk_score": None,
                "reflection_count": len(reflections),
                "message": f"Minimum 3 reflections required, found {len(reflections)}"
            }

        # Use LSTM aggregator for weekly prediction
        result = self.daic_model.predict_weekly(reflections)
        
        # Enhance result with metadata
        result["reflection_count"] = len(reflections)
        result["message"] = f"Weekly analysis based on {len(reflections)} reflections"
        
        return result
    
    def generate_for_user(self, db: Session, user_id: str) -> Dict:
        """
        Generate weekly risk assessment for a specific user.
        
        Retrieves the user's text reflections from the last 7 days
        and processes them using the LSTM aggregator.
        
        Args:
            db: Database session
            user_id: User session ID
            
        Returns:
            Dict containing weekly_risk_level (Low/Moderate/Elevated),
            reflection count, and analysis metadata
        """
        reflections = get_user_reflections_last_7_days(db, user_id)
        return self.generate_from_reflections(reflections)
    
    def generate_for_user_rolling(self, db: Session, user_id: str, days: int = 30) -> Dict:
        """
        Generate risk assessment using a LONGER rolling window.
        
        This collects more reflections to make LSTM aggregator effective:
        - 30 days typically yields 20-90 reflections (depending on user activity)
        - More reflections = better LSTM performance (trained on 80-120 utterances)
        
        Args:
            db: Database session
            user_id: User session ID
            days: Rolling window size in days (default: 30)
            
        Returns:
            Dict containing weekly_risk_level, reflection count, and metadata
        """
        window_start = datetime.now(timezone.utc) - timedelta(days=days)

        entries = (
            db.query(TextEntry)
            .filter(TextEntry.user_id == user_id)
            .filter(TextEntry.created_at >= window_start)
            .order_by(TextEntry.created_at.asc())
            .all()
        )

        reflections = [entry.text for entry in entries]
        result = self.generate_from_reflections(reflections)
        result["analysis_window_days"] = days
        result["message"] = f"{days}-day analysis based on {len(reflections)} reflections"
        
        return result