from datetime import date, timedelta

def test_submit_ema_valid(client, auth_context):
    """Test submitting valid daily EMA assessment"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 3,
            "2": 2,
            "3": 4,
            "4": 2,
            "5_severity": 3,
            "5_type": "I felt restless or found it difficult to sit still",
            "6": 4
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["date"] == str(date.today())


def test_submit_ema_all_questions(client, auth_context):
    """Test EMA with all question types"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 4,  # Depression
            "2": 3,  # Anxiety
            "3": 4,  # Sleep quality
            "4": 1,  # Sleep duration
            "5_severity": 4,  # Sleep problem severity
            "5_type": "My mind was frequently occupied by racing or negative thoughts",  # Sleep problem type
            "6": 3   # Energy level
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response.status_code == 200


def test_submit_ema_duplicate_date(client, auth_context):
    """Test that duplicate EMA submission for same date is rejected"""
    today_date = str(date.today())
    
    payload = {
        "date_submitted": today_date,
        "responses": {
            "1": 2, "2": 2, "3": 2, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    # First submission should succeed
    response1 = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response1.status_code == 200
    
    # Second submission for same date should fail
    response2 = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response2.status_code == 400


def test_submit_ema_different_dates(client, auth_context):
    """Test submitting EMA for different dates"""
    for i in range(3):
        payload = {
            "date_submitted": str(date.today() - timedelta(days=i)),
            "responses": {
                "1": 2 + i % 2,
                "2": 2,
                "3": 3,
                "4": 2,
                "5_severity": 2,
                "5_type": "My mind was frequently occupied by racing or negative thoughts",
                "6": 3
            }
        }

        response = client.post("/ema", json=payload, headers=auth_context["headers"])
        assert response.status_code == 200


def test_submit_ema_missing_responses(client, auth_context):
    """Test that missing required responses are rejected"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2,
            "2": 2,
            # Missing other required fields
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_submit_ema_invalid_response_values(client, auth_context):
    """Test that invalid response values are rejected"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 10,  # Out of range
            "2": 2,
            "3": 3,
            "4": 2,
            "5_severity": 3,
            "5_type": "I felt restless or found it difficult to sit still",
            "6": 4
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_submit_ema_missing_user_id(client):
    """Test that missing auth token is rejected"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload)
    assert response.status_code in [401, 403]


def test_submit_ema_invalid_date_format(client, auth_context):
    """Test that invalid date format is rejected"""
    payload = {
        "date_submitted": "invalid-date",
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response.status_code == 422


def test_submit_ema_future_date(client, auth_context):
    """Test that future dates are rejected"""
    future_date = str(date.today() + timedelta(days=7))
    
    payload = {
        "date_submitted": future_date,
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_get_today_status(client, auth_context):
    """Test retrieving today's EMA submission status"""
    response = client.get("/ema/today-status", headers=auth_context["headers"])
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == str(date.today())
    assert data["submitted"] is False


# def test_submit_ema_special_sleep_types(client):
#     """Test EMA with different sleep problem types"""
#     sleep_types = ["normal", "insomnia", "restless", "nightmares", "apnea"]
    
#     for idx, sleep_type in enumerate(sleep_types):
#         payload = {
#             "user_id": f"test-user-sleep-{idx}",
#             "date_submitted": str(date.today() - timedelta(days=idx)),
#             "responses": {
#                 "1": 2, "2": 2, "3": 3, "4": 2,
#                 "5_severity": 3,
#                 "5_type": sleep_type,
#                 "6": 3
#             }
#         }
        
#         response = client.post("/ema", json=payload)
#         assert response.status_code == 200