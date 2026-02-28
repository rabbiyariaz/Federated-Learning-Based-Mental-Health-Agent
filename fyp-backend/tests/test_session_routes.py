from datetime import date, timedelta



def test_create_session(client):
    """Test creating a new anonymous session"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "created_at" in data
    assert isinstance(data["session_id"], str)
    assert len(data["session_id"]) > 0


def test_create_multiple_sessions(client):
    """Test creating multiple sessions returns unique IDs"""
    response1 = client.post("/api/sessions/create")
    response2 = client.post("/api/sessions/create")
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    session_id1 = response1.json()["session_id"]
    session_id2 = response2.json()["session_id"]
    
    assert session_id1 != session_id2


def test_validate_session_valid(client):
    """Test validating an existing session"""
    # First create a session
    create_response = client.post("/api/sessions/create")
    session_id = create_response.json()["session_id"]
    
    # Then validate it
    validate_response = client.get(f"/api/sessions/validate/{session_id}")
    print(f"Validate response status code: {validate_response.status_code}")
    assert validate_response.status_code == 200
    data = validate_response.json()
    # print(f"I am data:{data}")
    assert data["valid"] is True
    # assert data["session_id"] == session_id


def test_validate_session_nonexistent(client):
    """Test validating a non-existent session"""
    response = client.get("/api/sessions/validate/fake-session-id-12345")
    
    assert response.status_code in [404, 200]
    if response.status_code == 200:
        assert response.json()["valid"] is False


def test_validate_session_empty_id(client):
    """Test validating with empty session ID"""
    response = client.get("/api/sessions/validate/")
    
    assert response.status_code in [404, 405]


def test_get_session_info(client):
    """Test retrieving session information"""
    # Create a session first
    create_response = client.post("/api/sessions/create")
    session_id = create_response.json()["session_id"]
    
    # Get session info
    response = client.get(f"/api/sessions/{session_id}")
    
    if response.status_code == 200:
        data = response.json()
        assert "session_id" in data
        assert data["session_id"] == session_id


def test_delete_session(client):
    """Test deleting a session"""
    # Create a session
    create_response = client.post("/api/sessions/create")
    session_id = create_response.json()["session_id"]
    
    # Delete it
    delete_response = client.delete(f"/api/sessions/{session_id}")
    
    if delete_response.status_code == 200:
        # Verify it's deleted
        validate_response = client.get(f"/api/sessions/validate/{session_id}")
        if validate_response.status_code == 200:
            assert validate_response.json()["valid"] is False


def test_session_expiry(client):
    """Test that sessions have expiry information"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    data = response.json()
    
    # Check for expiry-related fields
    assert "created_at" in data or "expires_at" in data


def test_session_id_format(client):
    """Test that session IDs follow expected format"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    session_id = response.json()["session_id"]
    
    # Session ID should be a non-empty string
    assert isinstance(session_id, str)
    assert len(session_id) > 0
    # Typically UUIDs or similar format
    assert len(session_id) >= 8