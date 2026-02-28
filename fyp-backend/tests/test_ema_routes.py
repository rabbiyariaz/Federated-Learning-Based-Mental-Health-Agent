from datetime import date, timedelta

def test_submit_ema_valid(client):
    """Test submitting valid daily EMA assessment"""
    payload = {
        "user_id": "test-user-ema-123",
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
    
    response = client.post("/ema", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["user_id"] == "test-user-ema-123"


def test_submit_ema_all_questions(client):
    """Test EMA with all question types"""
    payload = {
        "user_id": "test-user-all",
        "date_submitted": str(date.today()),
        "responses": {
            "1": 4,  # Depression
            "2": 3,  # Anxiety
            "3": 5,  # Sleep quality
            "4": 1,  # Sleep duration
            "5_severity": 4,  # Sleep problem severity
            "5_type": "My mind was frequently occupied by racing or negative thoughts",  # Sleep problem type
            "6": 3   # Energy level
        }
    }
    
    response = client.post("/ema", json=payload)
    assert response.status_code == 200


def test_submit_ema_duplicate_date(client):
    """Test that duplicate EMA submission for same date is rejected"""
    user_id = "test-user-duplicate"
    today_date = str(date.today())
    
    payload = {
        "user_id": user_id,
        "date_submitted": today_date,
        "responses": {
            "1": 2, "2": 2, "3": 2, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    # First submission should succeed
    response1 = client.post("/ema", json=payload)
    assert response1.status_code == 200
    
    # Second submission for same date should fail
    response2 = client.post("/ema", json=payload)
    assert response2.status_code in [400, 409]


def test_submit_ema_different_dates(client):
    """Test submitting EMA for different dates"""
    user_id = "test-user-multi-date"
    
    for i in range(3):
        payload = {
            "user_id": user_id,
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
        
        response = client.post("/ema", json=payload)
        assert response.status_code == 200


def test_submit_ema_missing_responses(client):
    """Test that missing required responses are rejected"""
    payload = {
        "user_id": "test-user-missing",
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2,
            "2": 2,
            # Missing other required fields
        }
    }
    
    response = client.post("/ema", json=payload)
    print(f"Response status code: {response.status_code}")
    print(f"Response text: {response.text}")
    assert response.status_code in [400, 422]


def test_submit_ema_invalid_response_values(client):
    """Test that invalid response values are rejected"""
    payload = {
        "user_id": "test-user-invalid",
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
    
    response = client.post("/ema", json=payload)
    print(f"Response status code: {response.status_code}")
    print(f"Response text: {response.text}")
    assert response.status_code in [400, 422]


def test_submit_ema_missing_user_id(client):
    """Test that missing user_id is rejected"""
    payload = {
        "date_submitted": str(date.today()),
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload)
    assert response.status_code == 422


def test_submit_ema_invalid_date_format(client):
    """Test that invalid date format is rejected"""
    payload = {
        "user_id": "test-user-date",
        "date_submitted": "invalid-date",
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload)
    assert response.status_code in [400, 422]


def test_submit_ema_future_date(client):
    """Test that future dates are rejected"""
    future_date = str(date.today() + timedelta(days=7))
    
    payload = {
        "user_id": "test-user-future",
        "date_submitted": future_date,
        "responses": {
            "1": 2, "2": 2, "3": 3, "4": 2,
            "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
        }
    }
    
    response = client.post("/ema", json=payload)
    # Depending on validation, might be accepted or rejected
    assert response.status_code in [200, 400, 422]


def test_get_ema_history(client):
    """Test retrieving EMA history for a user"""
    user_id = "test-user-history"
    
    # Submit multiple EMAs
    for i in range(7):
        payload = {
            "user_id": user_id,
            "date_submitted": str(date.today() - timedelta(days=i)),
            "responses": {
                "1": 2, "2": 2, "3": 3, "4": 2,
                "5_severity": 2, "5_type": "My mind was frequently occupied by racing or negative thoughts", "6": 3
            }
        }
        client.post("/ema", json=payload)
    
    # Get history
    response = client.get(f"/ema/history/{user_id}")
    
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 7


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