


def test_submit_phq_day_0(client, auth_context):
    """Test submitting baseline PHQ-8 assessment (day 0)"""
    payload = {
        "responses": {
            "1": 2, "2": 1, "3": 2, "4": 1,
            "5": 0, "6": 1, "7": 1, "8": 0
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["total_score"] == 8




def test_submit_phq_invalid_responses_high(client, auth_context):
    """Test that response values above 3 are rejected"""
    payload = {
        "responses": {
            "1": 5,  # Invalid: must be 0-3
            "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_submit_phq_invalid_responses_negative(client, auth_context):
    """Test that negative response values are rejected"""
    payload = {
        "responses": {
            "1": -1,  # Invalid: must be 0-3
            "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_submit_phq_missing_responses(client, auth_context):
    """Test that missing responses are rejected"""
    payload = {
        "responses": {
            "1": 1, "2": 1, "3": 1,  # Missing questions 4-8
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    assert response.status_code == 400


def test_submit_phq_missing_user_id(client):
    """Test that missing auth token is rejected"""
    payload = {
        "responses": {
            "1": 1, "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload)
    assert response.status_code in [401, 403]


def test_submit_phq_all_zeros(client, auth_context):
    """Test submitting PHQ with all zero responses"""
    payload = {
        "responses": {
            "1": 0, "2": 0, "3": 0, "4": 0,
            "5": 0, "6": 0, "7": 0, "8": 0
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] == 0


def test_submit_phq_all_threes(client, auth_context):
    """Test submitting PHQ with all maximum responses"""
    payload = {
        "responses": {
            "1": 3, "2": 3, "3": 3, "4": 3,
            "5": 3, "6": 3, "7": 3, "8": 3
        }
    }
    
    response = client.post("/phq", json=payload, headers=auth_context["headers"])
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] == 24


def test_submit_phq_duplicate_prevention(client, auth_context):
    """Test that duplicate submissions are handled properly"""
    payload = {
        "responses": {
            "1": 2, "2": 2, "3": 2, "4": 2,
            "5": 2, "6": 2, "7": 2, "8": 2
        }
    }
    
    # First submission
    response1 = client.post("/phq", json=payload, headers=auth_context["headers"])
    assert response1.status_code == 200
    
    # Second submission is currently allowed by implementation
    response2 = client.post("/phq", json=payload, headers=auth_context["headers"])
    assert response2.status_code == 200


def test_get_phq_history_not_implemented(client, auth_context):
    """PHQ history route is not exposed in current implementation"""
    response = client.get(f"/phq/history/{auth_context['session_id']}", headers=auth_context["headers"])
    assert response.status_code == 404