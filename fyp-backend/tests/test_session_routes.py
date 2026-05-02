from datetime import datetime, timezone
import uuid
from jose import jwt
from app.auth import SECRET_KEY, ALGORITHM



def test_create_session(client):
    """Test creating a new anonymous session token"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "recovery_code" in data
    assert data["recovery_code"]

    payload = jwt.decode(data["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert "session_id" in payload
    assert "exp" in payload
    assert payload["type"] == "access"


def test_create_multiple_sessions(client):
    """Test creating multiple sessions returns unique token identities"""
    response1 = client.post("/api/sessions/create")
    response2 = client.post("/api/sessions/create")
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    payload1 = jwt.decode(response1.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    payload2 = jwt.decode(response2.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])

    session_id1 = payload1["session_id"]
    session_id2 = payload2["session_id"]
    
    assert session_id1 != session_id2


def test_validate_session_valid(client):
    """Legacy validate endpoint is not exposed in current implementation"""
    # First create a session
    create_response = client.post("/api/sessions/create")
    payload = jwt.decode(create_response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]
    
    # Then call legacy validate route
    validate_response = client.get(f"/api/sessions/validate/{session_id}")
    assert validate_response.status_code == 404


def test_validate_session_nonexistent(client):
    """Legacy validate endpoint should return 404"""
    response = client.get("/api/sessions/validate/fake-session-id-12345")
    assert response.status_code == 404


def test_validate_session_empty_id(client):
    """Test validating with empty session ID"""
    response = client.get("/api/sessions/validate/")
    
    assert response.status_code in [404, 405]


def test_get_session_info(client):
    """Legacy session info endpoint is not exposed in current implementation"""
    # Create a session first
    create_response = client.post("/api/sessions/create")
    payload = jwt.decode(create_response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]
    
    # Get session info
    response = client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 404


def test_delete_session(client):
    """Legacy delete endpoint is not exposed in current implementation"""
    # Create a session
    create_response = client.post("/api/sessions/create")
    payload = jwt.decode(create_response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]
    
    # Delete it
    delete_response = client.delete(f"/api/sessions/{session_id}")
    assert delete_response.status_code == 404


def test_session_expiry(client):
    """Test that tokens include expiry information"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    payload = jwt.decode(response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert "exp" in payload


def test_session_id_format(client):
    """Test that session IDs embedded in JWT follow UUID format"""
    response = client.post("/api/sessions/create")
    
    assert response.status_code == 200
    payload = jwt.decode(response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]
    
    parsed = uuid.UUID(session_id)
    assert str(parsed) == session_id


def test_session_refresh_endpoint_removed(client):
    response = client.post("/api/sessions/refresh")
    assert response.status_code == 404


def test_access_token_expiry_is_30_days(client):
    """Test that access tokens match the 30-day session lifetime"""
    response = client.post("/api/sessions/create")
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    
    # Check expiry time
    from datetime import datetime, timezone
    exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    
    # Should be approximately 30 days from now
    time_diff = (exp_time - now).total_seconds()
    assert 29 * 24 * 60 * 60 <= time_diff <= 31 * 24 * 60 * 60


def test_session_row_has_lifecycle_fields(client, db_session):
    response = client.post("/api/sessions/create")
    payload = jwt.decode(response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]

    from app.models import Session as SessionModel

    session = db_session.query(SessionModel).filter(SessionModel.session_id == session_id).first()

    assert session is not None
    assert session.is_revoked is False
    assert session.expires_at is not None
    assert session.last_active_at is not None
    assert session.created_at is not None
    assert session.recovery_code_hash is not None


def test_restore_session_with_recovery_code(client):
    create_response = client.post("/api/sessions/create")
    assert create_response.status_code == 200

    create_payload = create_response.json()
    create_token = create_payload["access_token"]
    recovery_code = create_payload["recovery_code"]

    create_decoded = jwt.decode(create_token, SECRET_KEY, algorithms=[ALGORITHM])
    original_session_id = create_decoded["session_id"]

    restore_response = client.post(
        "/api/sessions/restore",
        json={"recovery_code": recovery_code},
    )

    assert restore_response.status_code == 200
    restore_token = restore_response.json()["access_token"]
    restore_decoded = jwt.decode(restore_token, SECRET_KEY, algorithms=[ALGORITHM])

    assert restore_decoded["session_id"] == original_session_id


def test_restore_session_rejects_invalid_code(client):
    response = client.post(
        "/api/sessions/restore",
        json={"recovery_code": "INVALID-CODE-1234"},
    )

    assert response.status_code == 401