import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from jose import jwt
from app.auth import SECRET_KEY, ALGORITHM

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker



def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_session_create_and_validate_flow(client, auth_context):
    create = client.post("/api/sessions/create")
    assert create.status_code == 200
    token = create.json()["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert "session_id" in payload
    assert "exp" in payload

    validate = client.get("/ema/today-status", headers={"Authorization": f"Bearer {token}"})
    assert validate.status_code == 200
    assert "submitted" in validate.json()


def test_phq_then_report_flow(client, auth_context):
    phq_payload = {
        "responses": {"1": 2, "2": 1, "3": 2, "4": 1, "5": 0, "6": 1, "7": 1, "8": 0}
    }
    phq = client.post("/phq", json=phq_payload, headers=auth_context["headers"])
    assert phq.status_code == 200

    report = client.get("/report", headers=auth_context["headers"])
    assert report.status_code == 200
    data = report.json()
    assert "latest_phq" in data
    assert "ema_summary" in data


def test_ema_then_study_summary_flow(client, auth_context):
    ema_payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 3,
            "5_type": "I felt restless or found it difficult to sit still",
            "6": 3
        }
    }
    ema = client.post("/ema", json=ema_payload, headers=auth_context["headers"])
    assert ema.status_code == 200

    summary = client.get("/api/study/summary", headers=auth_context["headers"])
    assert summary.status_code == 200
    data = summary.json()
    assert len(data["ema"]) >= 1


def test_study_summary_empty_ok(client, auth_context):
    res = client.get("/api/study/summary", headers=auth_context["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data.get("hasData") is False
    assert data.get("phq") == []
    assert data.get("ema") == []


def test_report_empty_no_phq(client, auth_context):
    res = client.get("/report", headers=auth_context["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data.get("hasData") is False
    assert data.get("latest_phq") is None
    assert data.get("phq_list") == []


