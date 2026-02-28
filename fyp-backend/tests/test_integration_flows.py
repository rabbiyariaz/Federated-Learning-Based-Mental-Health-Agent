import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker



def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_session_create_and_validate_flow(client):
    create = client.post("/api/sessions/create")
    assert create.status_code == 200
    session_id = create.json()["session_id"]

    validate = client.get(f"/api/sessions/validate/{session_id}")
    assert validate.status_code == 200
    assert validate.json()["valid"] is True


def test_phq_then_report_flow(client):
    user_id = "int-user-phq"

    phq_payload = {
        "user_id": user_id,
        "responses": {"1": 2, "2": 1, "3": 2, "4": 1, "5": 0, "6": 1, "7": 1, "8": 0},
        "total_score":8
    }
    phq = client.post("/phq", json=phq_payload)
    assert phq.status_code == 200

    report = client.get(f"/report/{user_id}")
    assert report.status_code == 200
    data = report.json()
    assert data["user_id"] == user_id
    assert "ema_summary" in data


def test_ema_then_study_summary_flow(client):
    user_id = "int-user-ema"

    ema_payload = {
        "user_id": user_id,
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 3,
            "5_type": "I felt restless or found it difficult to sit still",
            "6": 3
        }
    }
    ema = client.post("/ema", json=ema_payload)
    assert ema.status_code == 200

    summary = client.get(f"/api/study/{user_id}/summary")
    assert summary.status_code == 200
    data = summary.json()
    assert len(data["ema"]) >= 1


def test_study_summary_404_no_data(client):
    res = client.get("/api/study/unknown-user/summary")
    assert res.status_code == 404


def test_report_404_no_phq(client):
    res = client.get("/report/unknown-user")
    assert res.status_code == 404


