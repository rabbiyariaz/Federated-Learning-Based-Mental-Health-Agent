# Backend API Contract  
Federated Learning–Based Mental Health Agent (FYP)

---

## Purpose

This document defines the API contract between the frontend and backend
for a mental health monitoring system using:

- PHQ-8 (baseline and follow-up assessment)
- EMA (Ecological Momentary Assessment) daily monitoring

The contract specifies:
- Core data entities
- API endpoints
- Request and response formats

This document serves as a design specification and is independent of
implementation details (e.g., FastAPI, database choice).

---

## System Overview

- Frontend: React (Vite)
- Backend: Python (FastAPI – planned)
- Storage (initial): Local database
- User authentication: Out of scope (single-user study prototype)

---
---

## Entities

### User
- user_id

### PHQAssessment
- user_id
- day (0 or 14)
- responses (q1–q8)
- total_score
- timestamp

### EMAEntry
- user_id
- study_day (1–14)
- responses (q1–q6)
- timestamp

---

## API Endpoints

### POST /phq
Stores a PHQ-8 assessment.

#### Request Body
```json
{
  "user_id": "U001",
  "day": 0,
  "responses": {
    "1": 2,
    "2": 1,
    "3": 0,
    "4": 3,
    "5": 1,
    "6": 2,
    "7": 1,
    "8": 0
  }
}
```

---

### POST /ema
Stores a daily EMA entry.

#### Request Body
```json
{
  "user_id": "U001",
  "study_day": 5,
  "responses": {
    "1": 3,
    "2": 2,
    "3": 1,
    "4": 4,
    "5": 2,
    "6": 1
  }
}
```

---

### GET /ema
Returns all EMA entries for a given user.

#### Query Parameter
`/ema?user_id=U001`

---

### GET /report
Returns summary metrics for the study period.

#### Response:
```json
{
  "phq_baseline_score": 12,
  "phq_followup_score": 7,
  "phq_change": -5,
  "ema_completion_rate": 86,
  "ema_summary": {
    "mood_average": 2.3,
    "mood_variability": 1.1
  }
}
#### Query Parameter
`/report?user_id=U001`