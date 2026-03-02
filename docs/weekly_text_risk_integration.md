# Weekly Text Risk Assessment - Integration Guide

## Overview

The Weekly Text Risk functionality uses an **LSTM aggregator** to analyze a user's text reflections over a 7-day period and classify their mental health risk level into one of three categories:

- **Low** - Minimal concern, positive or neutral mental state
- **Moderate** - Some indicators of distress, monitoring recommended  
- **Elevated** - Significant concerns, intervention may be needed

## Architecture

### Components

1. **TextEntry Model** (`app/models.py`)
   - Database model storing user text reflections
   - Tracks user_id, text content, and timestamp

2. **Text Entry Service** (`ml/ml_services/text_entry_service.py`)
   - `get_user_reflections_last_7_days()` - Retrieves text entries from past 7 days

3. **Weekly Report Service** (`ml/ml_services/weekly_report_service.py`)
   - `generate_from_reflections()` - Processes list of reflections
   - `generate_for_user()` - Complete user workflow (fetch + analyze)
   - Requires minimum 3 reflections for analysis

4. **DAIC LSTM Model** (`ml/daic.py`)
   - `predict_daic_weekly()` - LSTM aggregator for weekly risk classification
   - Uses BiLSTM to process sequence of daily reflections
   - Outputs probability score mapped to risk levels:
     - < 0.33 → Low
     - 0.33-0.66 → Moderate  
     - > 0.66 → Elevated

### API Endpoints

#### 1. Submit Text Entry
```
POST /text-entries
Headers: Authorization: Bearer {token}
Body: {
  "text": "Today I felt anxious about..."
}

Response: {
  "id": 1,
  "user_id": "uuid",
  "text": "Today I felt anxious about...",
  "created_at": "2026-03-01T10:00:00Z"
}
```

#### 2. Get Text Entries
```
GET /text-entries?limit=10
Headers: Authorization: Bearer {token}

Response: [
  {
    "id": 1,
    "user_id": "uuid",
    "text": "...",
    "created_at": "2026-03-01T10:00:00Z"
  },
  ...
]
```

#### 3. Get Entry Count & Status
```
GET /text-entries/count
Headers: Authorization: Bearer {token}

Response: {
  "total": 15,
  "last_7_days": 5,
  "weekly_analysis_ready": true  // true if ≥3 entries in last 7 days
}
```

#### 4. Get Weekly Risk Assessment
```
GET /report/weekly-text-risk
Headers: Authorization: Bearer {token}

Response: {
  "weekly_risk_level": "Moderate",  // Low | Moderate | Elevated | Insufficient Data | No Data
  "reflection_count": 5,
  "message": "Weekly analysis based on 5 reflections"
}
```

## Usage Workflow

### For End Users
1. Submit text reflections daily (journaling, mood notes, etc.)
2. After submitting 3+ entries within 7 days, weekly analysis becomes available
3. Request weekly risk assessment to see aggregated risk level

### For Developers

```python
from ml.ml_services.weekly_report_service import WeeklyReportService
from ml.daic_model import DAICModel

# Initialize service
daic_model = DAICModel()
daic_model.load()
weekly_service = WeeklyReportService(daic_model)

# Generate report for specific user
result = weekly_service.generate_for_user(db_session, user_id)
print(result["weekly_risk_level"])  # Low, Moderate, or Elevated

# Or analyze custom reflections
reflections = ["I felt good today", "Struggling with sleep", "Very anxious"]
result = weekly_service.generate_from_reflections(reflections)
```

## Technical Details

### LSTM Aggregator
The model uses a **BiLSTM (Bidirectional LSTM)** architecture:
- Processes each daily reflection through DistilBERT encoder
- Aggregates embeddings using BiLSTM to capture temporal patterns
- Final classification head predicts risk probability
- Architecture defined in `ml/daic.py: DistilBertMultiTaskWithAggregator`

### Configuration
Model settings in `ml/config.py`:
```python
DAIC_AGGR_HIDDEN = 256      # LSTM hidden size
DAIC_AGGR_LAYERS = 1        # LSTM layers
DAIC_AGGR_DROPOUT = 0.2     # Dropout rate
DAIC_MAX_SEQ_LEN = 128      # Max tokens per entry
```

### Minimum Data Requirements
- **3 reflections** minimum for weekly analysis
- Optimal: 5-7 daily reflections within 7-day window
- Less than 3 → Returns "Insufficient Data"
- No entries → Returns "No Data"

## Integration Testing

### Test Case 1: Insufficient Data
```bash
# Submit 2 entries (below minimum)
curl -X POST http://localhost:8000/text-entries \
  -H "Authorization: Bearer {token}" \
  -d '{"text": "Entry 1"}'
  
curl -X POST http://localhost:8000/text-entries \
  -H "Authorization: Bearer {token}" \
  -d '{"text": "Entry 2"}'

# Check weekly risk
curl http://localhost:8000/report/weekly-text-risk \
  -H "Authorization: Bearer {token}"
  
# Expected: {"weekly_risk_level": "Insufficient Data", "reflection_count": 2, ...}
```

### Test Case 2: Successful Analysis
```bash
# Submit 5 entries
for i in {1..5}; do
  curl -X POST http://localhost:8000/text-entries \
    -H "Authorization: Bearer {token}" \
    -d "{\"text\": \"Daily reflection $i\"}"
done

# Check weekly risk
curl http://localhost:8000/report/weekly-text-risk \
  -H "Authorization: Bearer {token}"
  
# Expected: {"weekly_risk_level": "Low|Moderate|Elevated", "reflection_count": 5, ...}
```

## Frontend Integration

Example React component:
```javascript
import { useState, useEffect } from 'react';
import { backend } from '../api/backend';

function WeeklyRiskCard() {
  const [risk, setRisk] = useState(null);
  
  useEffect(() => {
    async function fetchRisk() {
      const data = await backend.get('/report/weekly-text-risk');
      setRisk(data);
    }
    fetchRisk();
  }, []);
  
  const getRiskColor = (level) => {
    switch(level) {
      case 'Low': return 'green';
      case 'Moderate': return 'yellow';
      case 'Elevated': return 'red';
      default: return 'gray';
    }
  };
  
  return (
    <div className={`risk-card ${getRiskColor(risk?.weekly_risk_level)}`}>
      <h3>Weekly Risk Assessment</h3>
      <p className="risk-level">{risk?.weekly_risk_level}</p>
      <p className="message">{risk?.message}</p>
    </div>
  );
}
```

## Error Handling

The system handles various edge cases:
- Empty text entries → 400 Bad Request
- Insufficient data (< 3 entries) → Returns "Insufficient Data" status
- No entries found → Returns "No Data" status
- Model errors → 500 Internal Server Error with details

## Benefits of LSTM Aggregator

1. **Temporal Awareness** - Captures patterns across multiple days
2. **Context Integration** - Considers full week's narrative, not just individual entries
3. **Robust Classification** - Three-tier system balances sensitivity and specificity
4. **Efficient** - Single weekly prediction vs. averaging daily predictions

## Next Steps

- Consider adding trend analysis (risk level changes over weeks)
- Add confidence scores to predictions
- Implement alert thresholds for elevated risk
- Integrate with PHQ-9 assessments for comprehensive mental health monitoring
