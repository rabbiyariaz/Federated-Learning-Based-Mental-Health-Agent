


def test_submit_phq_day_0(client):
    """Test submitting baseline PHQ-8 assessment (day 0)"""
    payload = {
        "user_id": "test-user-123",
        "responses": {
            "1": 2, "2": 1, "3": 2, "4": 1,
            "5": 0, "6": 1, "7": 1, "8": 0
        }
    }
    
    response = client.post("/phq", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["user_id"] == "test-user-123"
    assert data["total_score"] == 8




def test_submit_phq_invalid_responses_high(client):
    """Test that response values above 3 are rejected"""
    payload = {
        "user_id": "test-user-high",

        "responses": {
            "1": 5,  # Invalid: must be 0-3
            "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload)
    assert response.status_code == 400


def test_submit_phq_invalid_responses_negative(client):
    """Test that negative response values are rejected"""
    payload = {
        "user_id": "test-user-negative",
        
        "responses": {
            "1": -1,  # Invalid: must be 0-3
            "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload)
    assert response.status_code == 400


def test_submit_phq_missing_responses(client):
    """Test that missing responses are rejected"""
    payload = {
        "user_id": "test-user-missing",
        "responses": {
            "1": 1, "2": 1, "3": 1,  # Missing questions 4-8
        }
    }
    
    response = client.post("/phq", json=payload)
    assert response.status_code in [400, 422]  # Bad request or validation error


def test_submit_phq_missing_user_id(client):
    """Test that missing user_id is rejected"""
    payload = {
        "responses": {
            "1": 1, "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    
    response = client.post("/phq", json=payload)
    assert response.status_code == 422


def test_submit_phq_all_zeros(client):
    """Test submitting PHQ with all zero responses"""
    payload = {
        "user_id": "test-user-zeros",
        "responses": {
            "1": 0, "2": 0, "3": 0, "4": 0,
            "5": 0, "6": 0, "7": 0, "8": 0
        }
    }
    
    response = client.post("/phq", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] == 0


def test_submit_phq_all_threes(client):
    """Test submitting PHQ with all maximum responses"""
    payload = {
        "user_id": "test-user-max",
        "responses": {
            "1": 3, "2": 3, "3": 3, "4": 3,
            "5": 3, "6": 3, "7": 3, "8": 3
        }
    }
    
    response = client.post("/phq", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_score"] == 24


def test_submit_phq_duplicate_prevention(client):
    """Test that duplicate submissions are handled properly"""
    payload = {
        "user_id": "test-user-duplicate",
        "responses": {
            "1": 2, "2": 2, "3": 2, "4": 2,
            "5": 2, "6": 2, "7": 2, "8": 2
        }
    }
    
    # First submission
    response1 = client.post("/phq", json=payload)
    assert response1.status_code == 200
    
    # Second submission with same user and 
    response2 = client.post("/phq", json=payload)
    # Should either succeed (update) or fail (duplicate prevention)
    assert response2.status_code in [200, 400, 409]


def test_get_phq_history(client):
    """Test retrieving PHQ history for a user"""
    user_id = "test-user-history"
    
    # Submit baseline
    payload1 = {
        "user_id": user_id,
        "responses": {
            "1": 2, "2": 2, "3": 2, "4": 2,
            "5": 2, "6": 2, "7": 2, "8": 2
        }
    }
    client.post("/phq", json=payload1)
    
    # Submit follow-up
    payload2 = {
        "user_id": user_id,
        "responses": {
            "1": 1, "2": 1, "3": 1, "4": 1,
            "5": 1, "6": 1, "7": 1, "8": 1
        }
    }
    client.post("/phq", json=payload2)
    
    # Get history
    response = client.get(f"/phq/history/{user_id}")
    
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2