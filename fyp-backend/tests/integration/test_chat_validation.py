import pytest

pytestmark = pytest.mark.integration

def test_chat_missing_message_returns_422(client):
    payload = {"history": []}  # message missing
    r = client.post("/chat", json=payload)
    assert r.status_code == 422

def test_chat_message_wrong_type_returns_422(client):
    payload = {"message": 123, "history": []}  # message should be string
    r = client.post("/chat", json=payload)
    assert r.status_code == 422
