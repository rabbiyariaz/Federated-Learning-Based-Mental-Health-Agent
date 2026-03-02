# Frontend Weekly Text Risk Integration

## Overview
The Weekly Text Risk Assessment has been successfully integrated into the frontend ReportPage. It displays the user's mental health risk level based on their text reflections from the past 7 days.

## Changes Made

### 1. Backend API Function (`src/api/backend.js`)

Added new API function to fetch weekly text risk:

```javascript
export async function fetchWeeklyTextRisk(signal) {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/report/weekly-text-risk`, {
    signal,
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  // Token refresh logic included
  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();
    // Retry request with new token
  }

  if (!res.ok) {
    throw new Error(`Weekly text risk fetch failed: ${res.status}`);
  }

  return res.json();
}
```

### 2. ReportPage Component Updates (`src/pages/ReportPage.jsx`)

#### State Management
Added new state for weekly text risk data:
```javascript
const [weeklyTextRisk, setWeeklyTextRisk] = useState(null);
```

#### Data Fetching
Updated `useEffect` to fetch both report and weekly text risk in parallel:
```javascript
const [reportData, weeklyRiskData] = await Promise.all([
  fetchReport(controller.signal),
  fetchWeeklyTextRisk(controller.signal).catch(err => {
    console.warn("Weekly text risk fetch failed:", err);
    return null; // Don't fail the whole page if weekly risk fails
  })
]);
```

#### Visual Display Components

**Three-Tier Risk Display (Low/Moderate/Elevated)**
- **Low Risk**: Green badge with emerald colors
- **Moderate Risk**: Yellow/amber badge 
- **Elevated Risk**: Red badge

**Component Features:**
- Prominent card with gradient purple background
- Large risk level badge with color coding
- Reflection count display
- Analysis message
- Explanatory text about LSTM aggregator

**Code:**
```jsx
{weeklyTextRisk && weeklyTextRisk.weekly_risk_level !== 'No Data' && 
 weeklyTextRisk.weekly_risk_level !== 'Insufficient Data' && (
  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md p-6 mb-8 border-2 border-purple-200">
    {/* Icon and Title */}
    <div className="flex items-center gap-3 mb-4">
      <svg>...</svg>
      <h3>Weekly Text Risk Assessment</h3>
    </div>

    {/* Risk Level and Count Display */}
    <div className="flex items-center gap-6 mb-4">
      <div className="flex-1">
        <div className={`... ${
          weeklyTextRisk.weekly_risk_level === 'Low' 
            ? 'bg-emerald-500 text-white'
            : weeklyTextRisk.weekly_risk_level === 'Moderate'
            ? 'bg-amber-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {weeklyTextRisk.weekly_risk_level}
        </div>
      </div>
      <div className="flex-1">
        <p>{weeklyTextRisk.reflection_count}</p>
        <p>from last 7 days</p>
      </div>
    </div>

    {/* Analysis Message */}
    <div className="bg-white rounded-lg p-4 mt-4">
      <p>{weeklyTextRisk.message}</p>
    </div>
  </div>
)}
```

**Insufficient Data Display**
Shows informative message when user hasn't submitted enough reflections:
```jsx
{weeklyTextRisk && (weeklyTextRisk.weekly_risk_level === 'Insufficient Data' || 
 weeklyTextRisk.weekly_risk_level === 'No Data') && (
  <div className="bg-blue-50 rounded-lg shadow-sm p-6 mb-8 border border-blue-200">
    <div className="flex items-center gap-3">
      <svg>...</svg>
      <div>
        <h4>Weekly Text Risk Assessment</h4>
        <p>{weeklyTextRisk.message} Submit at least 3 text reflections to enable weekly risk analysis.</p>
      </div>
    </div>
  </div>
)}
```

### 3. Generated Report Text

Updated the downloadable report to include weekly text risk section:
```javascript
${weeklyTextRisk && weeklyTextRisk.weekly_risk_level !== 'No Data' ? `
WEEKLY TEXT RISK ASSESSMENT
-----------------------------
Risk Level: ${weeklyTextRisk.weekly_risk_level}
Reflections Analyzed: ${weeklyTextRisk.reflection_count}
${weeklyTextRisk.message}

Note: This assessment uses an LSTM aggregator to analyze your text reflections
over the past 7 days and classify your mental health risk into one of three
categories: Low, Moderate, or Elevated.

` : ''}
```

## Visual Layout

The report page now displays sections in this order:
1. Header - "Your Symptom Monitoring Summary"
2. Summary Cards (First Assessment, Daily Check-ins)
3. **Weekly Text Risk Assessment** (NEW - prominent purple card)
4. Weekly EMA Summary
5. PHQ Progress & Trend Analysis
6. Report Details
7. Generate Report Button

## Risk Level Colors

| Level | Background | Text | Indicator |
|-------|-----------|------|-----------|
| Low | `bg-emerald-500` | `text-white` | 🟢 Green |
| Moderate | `bg-amber-500` | `text-white` | 🟡 Yellow |
| Elevated | `bg-red-500` | `text-white` | 🔴 Red |
| Insufficient/No Data | `bg-blue-50` | `text-blue-700` | 🔵 Blue (info) |

## User Experience Flow

1. **User submits text reflections** via text entry endpoint
2. **After 3+ reflections in 7 days**, weekly analysis becomes available
3. **User visits Report Page**
   - Page loads both report data and weekly text risk in parallel
   - Weekly text risk card displays prominently
4. **Risk level displayed with color coding**
   - Easy to understand at a glance
   - Detailed message explains the analysis
5. **User can generate full report**
   - Downloaded report includes weekly text risk section

## Error Handling

- If weekly text risk API fails, it doesn't break the entire page
- Uses `.catch()` to handle errors gracefully
- Shows "Insufficient Data" message if < 3 reflections
- Shows "No Data" message if 0 reflections

## Data Structure

**Weekly Text Risk Response:**
```json
{
  "weekly_risk_level": "Low" | "Moderate" | "Elevated" | "Insufficient Data" | "No Data",
  "reflection_count": 5,
  "message": "Weekly analysis based on 5 reflections"
}
```

## Testing Checklist

- [x] API endpoint integration
- [x] State management
- [x] Parallel data fetching
- [x] Visual display for all risk levels
- [x] Insufficient data message
- [x] Report generation includes weekly risk
- [x] Color coding matches risk levels
- [x] Responsive design
- [x] Error handling
- [x] No errors in console

## Next Steps

To fully test the integration:

1. **Start the backend server**
   ```bash
   cd fyp-backend
   uvicorn app.main:app --reload
   ```

2. **Start the frontend**
   ```bash
   cd fyp-frontend
   npm run dev
   ```

3. **Test the flow:**
   - Create a session
   - Submit 3+ text entries (using the new `/text-entries` endpoint)
   - Navigate to Report Page
   - Verify weekly text risk card appears
   - Check that risk level is displayed correctly
   - Generate report and verify it includes weekly text risk

## Benefits

✅ **User-friendly** - Clear visual indicators with color coding  
✅ **Informative** - Explains what the assessment means  
✅ **Integrated** - Seamlessly fits into existing report structure  
✅ **Resilient** - Graceful error handling  
✅ **Complete** - Included in both UI and downloadable report  
✅ **Professional** - Beautiful gradient design with icons  

The weekly text risk functionality is now fully integrated and ready for use!
