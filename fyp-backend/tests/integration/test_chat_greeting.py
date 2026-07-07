import pytest

pytestmark = pytest.mark.integration

def test_chat_greeting_returns_response(client, auth_context):
    payload = {"message": "hi", "history": []}
    r = client.post("/chat", json=payload, headers=auth_context["headers"])

    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert isinstance(data["response"], str)
    assert data["response"].strip() != ""
