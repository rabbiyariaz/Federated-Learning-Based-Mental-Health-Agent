# Test Case Planning for Mental Health Monitoring System

---

## **Presentation Summary: Key Functional Test Cases (Defense)**

### Selected Functional Requirements Test Cases

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-001 | Create anonymous session with JWT | POST `/api/sessions/create` | Returns access_token and token_type "bearer" |
| TC-007 | Submit valid PHQ-8 assessment | POST `/phq` with 8 responses (0-3) + auth | Returns calculated score and severity level |
| TC-010 | Reject invalid PHQ values | POST `/phq` with value outside 0-3 range | Status 400 with validation error |
| TC-016 | Submit valid daily EMA | POST `/ema` with all required fields + auth | Status 200, EMA stored successfully |
| TC-018 | Prevent duplicate EMA for same date | POST `/ema` twice for same date | First succeeds, second returns 400 duplicate error |
| TC-029 | Submit text reflection | POST `/text-entries` with text + auth | Status 201, text stored with timestamp |
| TC-036 | Generate weekly text risk | GET `/report/weekly-text-risk` with 3+ reflections | Returns risk level (Low/Moderate/Elevated) |
| TC-042 | Generate weekly monitoring report | GET `/report` with PHQ + EMA data | Returns comprehensive report with trends and analytics |
| TC-063 | Complete EMA to dashboard flow | Create session → Submit EMA → Get summary | End-to-end workflow succeeds with data displayed |
| TC-066 | Full participant monitoring journey | Session → PHQ → Daily EMAs → Text → Report | Complete workflow with trend analysis and risk assessment |

---

## **Non-Functional Requirements (Defense)**

### Performance & Reliability Test Cases

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| NFR-001 | API response time performance | Execute API endpoint under normal load | Response returned within < 2 seconds |
| NFR-002 | Concurrent user session handling | Create 10 simultaneous authenticated sessions | All sessions created successfully, no conflicts |
| NFR-003 | Data persistence after submission | Submit PHQ/EMA then query database | 100% of submitted data persists in database |
| NFR-004 | JWT token expiration enforcement | Use token after 30 days expiration | Token rejected with 401, requires refresh |
| NFR-005 | Graceful error handling | Trigger API error (invalid input) | Error logged, user receives clear error message, no data corruption |
| NFR-006 | Complete input validation | Submit data with injection, special chars, missing fields | All invalid inputs rejected before storage |
| NFR-007 | Authentication enforcement | Request protected endpoint without token | Status 401 Unauthorized returned |
| NFR-008 | Data privacy & anonymity | Verify user data storage | Only session_id linked to data, no PII stored directly |

---

## **Overall Test Cases Summary (Defense)**

### Testing Phases & Objectives

| Phase | Testing Type | Objective | Test Case Coverage |
|-------|--------------|-----------|-------------------|
| **Phase 1** | Unit Testing | Validate individual API endpoints and business logic functions | TC-001 to TC-035 (35 cases) |
| **Phase 2** | Integration Testing | Verify data flow across multiple modules and complete workflows | TC-062 to TC-067 (6 cases) |
| **Phase 3** | Security & Authentication Testing | Ensure proper authorization, token handling, and data protection | TC-004, TC-013, TC-022, TC-068, NFR-004, NFR-007, NFR-008 (7 cases) |
| **Phase 4** | Data Validation & Error Handling | Test input validation, boundary conditions, and error responses | TC-020 to TC-028, TC-070 to TC-073 (13 cases) |
| **Phase 5** | Performance & Reliability Testing | Verify response times, concurrency, persistence, data accuracy | NFR-001 to NFR-006 (6 cases) |
| **Phase 6** | End-to-End & Business Logic Testing | Validate complete participant journeys and trend analytics | TC-036 to TC-055, TC-063 to TC-066 (20+ cases) |

**Total Coverage**: 73+ test cases across 6 testing phases | Target Success Rate: 100%

---

## **Testing Tools & Framework (Defense)**

| Tool | Testing Type | Purpose | Usage in Project |
|------|-------------|---------|------------------|
| **pytest** | Unit, Integration, API | Backend test framework and automation | Automated test execution, fixtures, assertions for all API tests |
| **FastAPI TestClient** | API, Integration | HTTP client for API testing | Simulates HTTP requests to endpoints without running server |
| **Postman** | API, Manual | API testing and documentation | Manual API endpoint testing, request validation, response inspection |
| **Apache JMeter** | Performance, Load | Performance and load testing | Test API response times, concurrent users, throughput capacity |
| **SQLite (in-memory)** | Database, Unit | Test database environment | Isolated database for each test, no data persistence between tests |
| **python-jose** | Security (JWT) | JWT token testing and validation | Token generation, validation, expiry checks, payload verification |
| **OWASP ZAP** | Security (Vulnerability) | Web security vulnerability scanner | Automated security scanning, SQL injection, XSS detection |
| **Bandit** | Security (Code) | Python code security linter | Scan code for common security issues and vulnerabilities |
| **Safety** | Security (Dependencies) | Dependency vulnerability checker | Check Python packages for known security vulnerabilities |
| **pytest-cov** | Code Coverage | Coverage analysis and reporting | Measures test coverage percentage, generates HTML reports |
| **SQLAlchemy** | Database, ORM | Database testing framework | Test database queries, models, data persistence, relationships |
| **Locust** | Performance, Stress | Load testing and stress testing | Simulate concurrent users, measure system behavior under load |

**Execution Commands**:  
- **Unit/API/Integration**: `pytest tests/ -v --cov=app --cov-report=html`  
- **Performance Testing**: `jmeter -n -t test_plan.jmx`  
- **Security Scanning**: `zap-cli quick-scan http://localhost:8000`  
- **Code Security**: `bandit -r app/`  
- **Dependency Security**: `safety check`  

**Target**: >85% coverage | **Security Tools**: 4 (JWT, OWASP ZAP, Bandit, Safety)

---

## **All Test Types Required in Project (Defense)**

| Test Type | Description | Scope | Examples in Project |
|-----------|-------------|-------|---------------------|
| **Unit Testing** | Test individual functions and API endpoints in isolation | Single functions, endpoints, business logic | PHQ scoring, EMA validation, token generation |
| **Integration Testing** | Test interaction between multiple modules and services | Multi-module workflows, database operations | Session → EMA → Report flow, PHQ → Analytics |
| **API Testing** | Validate REST API endpoints, request/response structures | All HTTP endpoints (GET, POST) | All TC-001 to TC-067 test cases |
| **Security Testing** | Test authentication, authorization, data protection | JWT tokens, protected endpoints, user data | Token validation, unauthorized access prevention |
| **Performance Testing** | Measure response times, throughput, concurrency | API response latency, concurrent users | Response time <2s, 10+ concurrent sessions |
| **Data Validation Testing** | Verify input validation, boundary conditions, error handling | All user inputs, date ranges, data types | PHQ range (0-3), EMA date validation, empty inputs |
| **Database Testing** | Test data persistence, retrieval, integrity | CRUD operations, data relationships | EMA storage, PHQ retrieval, duplicate prevention |
| **End-to-End Testing** | Test complete user workflows from start to finish | Full participant journey | Session creation → Data submission → Report generation |
| **Regression Testing** | Ensure new changes don't break existing functionality | All previously passing tests | Re-run full test suite after changes |
| **Acceptance Testing** | Validate system meets business requirements | Clinical requirements, user needs | PHQ severity classification, weekly risk assessment |

**Total Test Types**: 10 | **Implementation**: All automated via pytest framework

---

## Functional Requirements Test Cases (Complete)

### 1. Session Management & Authentication

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-001 | Create anonymous session | POST `/api/sessions/create` with no payload | Status: 200, Returns JWT access_token and token_type "bearer" |
| TC-002 | Create multiple unique sessions | POST `/api/sessions/create` twice | Each request returns unique session_id in JWT payload |
| TC-003 | JWT token contains session metadata | Decode JWT token from session creation | Token payload contains session_id and expiration time (exp) |
| TC-004 | Access protected endpoint without token | POST `/ema` without Authorization header | Status: 401 Unauthorized |
| TC-005 | Access protected endpoint with valid token | GET `/ema/today-status` with valid Authorization Bearer token | Status: 200, Returns today's submission status |
| TC-006 | Session ID follows UUID format | Extract session_id from JWT token | Session ID is valid UUID v4 format |

---

### 2. PHQ-8 Depression Assessment

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-007 | Submit valid PHQ-8 baseline | POST `/phq` with 8 valid responses (0-3) and auth token | Status: 200, Returns status "ok", total_score calculated correctly, severity level assigned |
| TC-008 | Submit PHQ-8 with all zeros | POST `/phq` with responses all set to 0 | Status: 200, total_score = 0, severity = "minimal" |
| TC-009 | Submit PHQ-8 with maximum scores | POST `/phq` with responses all set to 3 | Status: 200, total_score = 24, severity = "severe" |
| TC-010 | Reject PHQ-8 with invalid high values | POST `/phq` with response value 5 (out of 0-3 range) | Status: 400 Bad Request, Error message about invalid range |
| TC-011 | Reject PHQ-8 with negative values | POST `/phq` with response value -1 | Status: 400 Bad Request |
| TC-012 | Reject PHQ-8 with missing responses | POST `/phq` with only 3 responses (missing 5 questions) | Status: 400 Bad Request, Error about exactly 8 responses required |
| TC-013 | Reject PHQ-8 without authentication | POST `/phq` without Authorization header | Status: 401 Unauthorized |
| TC-014 | Allow multiple PHQ submissions | POST `/phq` twice with same auth token | Both return Status: 200, stored as separate assessments |
| TC-015 | Calculate PHQ severity levels | POST `/phq` with scores: 4, 9, 14, 19, 20 | Severity: minimal, mild, moderate, moderately_severe, severe respectively |

---

### 3. Daily EMA (Ecological Momentary Assessment)

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-016 | Submit valid daily EMA | POST `/ema` with valid date and all required responses (1-6, 5_severity, 5_type) | Status: 200, Returns status "ok" and submitted date |
| TC-017 | Submit EMA with all question types | POST `/ema` with responses for depression, anxiety, sleep quality/duration/severity/type, energy | Status: 200, EMA stored successfully |
| TC-018 | Prevent duplicate EMA for same date | POST `/ema` twice with same date | First: Status 200, Second: Status 400 with duplicate error |
| TC-019 | Submit EMA for different dates | POST `/ema` for today, yesterday, and 2 days ago | All return Status: 200, stored as separate entries |
| TC-020 | Reject EMA with missing required fields | POST `/ema` with only questions 1 and 2 | Status: 400, Error about missing required fields |
| TC-021 | Reject EMA with out-of-range values | POST `/ema` with response value 10 (valid range 0-4) | Status: 400, Error about invalid range |
| TC-022 | Reject EMA without authentication | POST `/ema` without Authorization header | Status: 401 Unauthorized |
| TC-023 | Reject EMA with invalid date format | POST `/ema` with date_submitted = "invalid-date" | Status: 422 Unprocessable Entity |
| TC-024 | Reject EMA with future date | POST `/ema` with date 7 days in future | Status: 400, Error about future dates not allowed |
| TC-025 | Reject EMA with date too far in past | POST `/ema` with date 31+ days ago | Status: 400, Error about invalid EMA date |
| TC-026 | Get today's EMA submission status | GET `/ema/today-status` with auth token | Status: 200, Returns today's date and submitted flag (true/false) |
| TC-027 | Validate sleep problem type | POST `/ema` with valid 5_type from allowed list | Status: 200, EMA accepted |
| TC-028 | Reject invalid sleep problem type | POST `/ema` with 5_type not in allowed list | Status: 400, Error about invalid 5_type value |

---

### 4. Text Entry & Analysis

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-029 | Submit text reflection entry | POST `/text-entries` with text content and auth token | Status: 201 Created, Returns entry id, user_id, text, created_at |
| TC-030 | Reject empty text entry | POST `/text-entries` with empty or whitespace-only text | Status: 400, Error about empty text |
| TC-031 | Get user's text entries | GET `/text-entries?limit=10` with auth token | Status: 200, Returns list of text entries ordered by newest first |
| TC-032 | Get text entry count | GET `/text-entries/count` with auth token | Status: 200, Returns total count, last_7_days count, weekly_analysis_ready flag |
| TC-033 | Analyze text for emotions and risk | POST `/predict` with text content (no auth) | Status: 200, Returns primary_emotion, dominant_emotions, text_risk_level, risk_score |
| TC-034 | Detect crisis in text | POST `/predict` with high-risk crisis text | Status: 200, Returns crisis_detected, risk_level elevated, primary_emotion "distress" |
| TC-035 | Normal text emotion analysis | POST `/predict` with neutral/positive text | Status: 200, Returns emotion labels from GoEmotions model |

---

### 5. Weekly Text Risk Assessment (LSTM Aggregation)

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-036 | Generate weekly text risk with sufficient data | GET `/report/weekly-text-risk` with auth (3+ reflections in 7 days) | Status: 200, Returns weekly_risk_level (Low/Moderate/Elevated), reflection_count, message |
| TC-037 | Handle insufficient reflections | GET `/report/weekly-text-risk` with < 3 reflections in 7 days | Status: 200, Returns weekly_risk_level "Insufficient Data", reflection_count, appropriate message |
| TC-038 | Handle no reflections | GET `/report/weekly-text-risk` with 0 reflections | Status: 200, Returns weekly_risk_level "No Data", reflection_count 0 |
| TC-039 | Classify low risk from reflections | LSTM processes 5+ positive/neutral reflections | Returns weekly_risk_level "Low" |
| TC-040 | Classify moderate risk from reflections | LSTM processes mixed reflections with mild distress | Returns weekly_risk_level "Moderate" |
| TC-041 | Classify elevated risk from reflections | LSTM processes reflections with significant distress indicators | Returns weekly_risk_level "Elevated" |

---

### 6. Report Generation & Trend Analysis

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-042 | Generate weekly report with PHQ data | GET `/report` with auth (at least 1 PHQ submitted) | Status: 200, Returns latest_phq, ema_summary, phq_trend, ema_days_completed |
| TC-043 | Report shows latest PHQ details | GET `/report` after submitting multiple PHQs | latest_phq contains most recent score and timestamp |
| TC-044 | Report includes 7-day EMA window | GET `/report` with EMA entries before latest PHQ | ema_summary includes entries from 7 days before PHQ date |
| TC-045 | Calculate PHQ progress between assessments | GET `/report` with 2+ PHQs ≥7 days apart | phq_progress shows previous_score, current_score, change, status, days_between |
| TC-046 | Detect significant PHQ improvement | 2 PHQs with score decrease ≥5 points | phq_progress.status = "Significant improvement" |
| TC-047 | Detect significant PHQ worsening | 2 PHQs with score increase ≥5 points | phq_progress.status = "Significant worsening" |
| TC-048 | Detect no major PHQ change | 2 PHQs with score change < 5 points | phq_progress.status = "No major change" |
| TC-049 | Calculate PHQ trend across multiple assessments | GET `/report` with 3+ PHQs ≥7 days apart | phq_trend shows num_assessments, first_score, last_score, total_change, trend_direction, pattern |
| TC-050 | Ignore PHQs less than 7 days apart in trend | Multiple PHQs with < 7 day gaps | Only PHQs ≥7 days apart included in trend calculation |
| TC-051 | Calculate EMA summary statistics | GET `/report` with multiple EMA entries | ema_summary includes weekly_avg_depression, weekly_avg_anxiety, weekly_avg_sleep, mood_variability |
| TC-052 | Detect EMA depression trend | 4+ EMA entries showing improving/worsening pattern | ema_summary.trend_depression = "Improving"/"Worsening"/"Stable" |
| TC-053 | Detect EMA sleep trend | 4+ EMA entries showing sleep pattern | ema_summary.trend_sleep = "Improving"/"Worsening"/"Stable" |
| TC-054 | Calculate EMA adherence | 5 EMA entries completed out of 7 days | ema_summary.adherence_percent = 71.4% |
| TC-055 | Report returns 404 with no PHQ data | GET `/report` with auth but no PHQ submissions | Status: 404, Error message "No PHQ data found" |

---

### 7. Study Summary & Dashboard

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-056 | Get dashboard summary with all data | GET `/api/study/summary` with auth (PHQ and EMA submitted) | Status: 200, Returns phq array, ema array, ema_summary |
| TC-057 | Dashboard shows PHQ history | GET `/api/study/summary` with multiple PHQs | phq array contains all assessments with totalScore and submittedAt |
| TC-058 | Dashboard shows EMA history | GET `/api/study/summary` with multiple EMAs | ema array contains all entries with date, responses, submittedAt |
| TC-059 | Dashboard includes EMA analytics | GET `/api/study/summary` with EMA data | ema_summary contains computed trends and statistics |
| TC-060 | Dashboard returns 404 with no data | GET `/api/study/summary` with auth but no submissions | Status: 404, Error message "No data found" |
| TC-061 | Dashboard filters EMA up to today | GET `/api/study/summary` (EMA entries include today or past) | Only EMA entries ≤ today's date returned |

---

### 8. Integration & End-to-End Flows

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-062 | Complete PHQ to report workflow | Create session → Submit PHQ → Generate report | All steps succeed, report contains PHQ data |
| TC-063 | Complete EMA to summary workflow | Create session → Submit EMA → Get study summary | All steps succeed, summary contains EMA data |
| TC-064 | Multi-day monitoring workflow | Submit EMA daily for 7 days → Submit PHQ → Generate report | Report shows complete 7-day EMA window with PHQ |
| TC-065 | Text reflection to weekly risk workflow | Submit 5+ text entries over 7 days → Get weekly text risk | Weekly risk returns valid classification (Low/Moderate/Elevated) |
| TC-066 | Complete participant journey | Create session → PHQ baseline → Daily EMAs → Text entries → Follow-up PHQ → Generate report | Full report with trends, progress, and weekly text risk |
| TC-067 | Health check endpoint | GET `/health` | Status: 200, Returns {"status": "ok"} |

---

### 9. Data Validation & Error Handling

| ID | Test Case Description | Input/Action | Expected Result |
|----|----------------------|--------------|-----------------|
| TC-068 | Token refresh on 401 error | Make authenticated request with expired token | Frontend catches 401, gets new token, retries successfully |
| TC-069 | Handle network errors gracefully | API request with network timeout | Error caught and user-friendly message displayed |
| TC-070 | Validate EMA response type for 5_type | POST `/ema` with 5_type not string | Status: 400, Type validation error |
| TC-071 | Validate PHQ response count | POST `/phq` with 7 or 9 responses instead of 8 | Status: 400, Error about exactly 8 responses |
| TC-072 | Handle concurrent EMA submissions | Two simultaneous POST `/ema` for same date | First succeeds, second returns duplicate error |
| TC-073 | Sanitize text entry input | POST `/text-entries` with text containing special characters | Status: 201, Text stored with special characters preserved |

---

## Test Execution Summary

### Test Coverage by Module

| Module | Total Test Cases | Priority |
|--------|-----------------|----------|
| Session Management & Auth | 6 | High |
| PHQ-8 Assessment | 9 | High |
| Daily EMA | 13 | High |
| Text Entry & Analysis | 7 | High |
| Weekly Text Risk (LSTM) | 6 | High |
| Report Generation & Trends | 14 | High |
| Study Summary/Dashboard | 6 | Medium |
| Integration Flows | 6 | High |
| Data Validation | 6 | Medium |
| **TOTAL** | **73** | - |

### Test Priority Levels

- **High Priority (60 cases)**: Core functional requirements, authentication, data submission, report generation
- **Medium Priority (13 cases)**: Dashboard features, advanced validation, edge cases

### Testing Tools & Framework

- **Backend**: pytest with FastAPI TestClient
- **Database**: SQLite in-memory for test isolation
- **Authentication**: JWT token generation and validation
- **Test Fixtures**: Session, database, and auth_context fixtures for reusability

### Continuous Integration

All test cases are automated and run via pytest:
```bash
pytest tests/ -v --cov=app --cov-report=html
```

---

## Notes for Defense Presentation

### Key Testing Achievements

1. **Comprehensive Coverage**: 73 test cases covering all major functional requirements
2. **Automated Testing**: All tests executable via pytest with clear pass/fail status
3. **Realistic Scenarios**: Integration tests simulate complete user journeys
4. **Data Integrity**: Tests verify validation rules, duplicate prevention, and business logic
5. **Security Testing**: Authentication and authorization tests ensure protected endpoints

### Test Case Statistics

- **API Endpoints Tested**: 12 distinct endpoints
- **Validation Rules Tested**: 15+ validation scenarios
- **Integration Flows**: 6 end-to-end workflows
- **Edge Cases Covered**: 20+ boundary and error conditions

### Quality Metrics

- Test success rate: Target 100%
- Code coverage: Target >85% for API routes
- Average test execution time: <5 seconds per test
- Total test suite execution: <30 seconds
