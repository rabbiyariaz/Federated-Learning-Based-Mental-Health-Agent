import pytest

pytestmark = pytest.mark.integration

def test_chat_crisis_routing_returns_safety_message(client, auth_context):
    payload = {"message": "I want to kill myself", "history": []}
    r = client.post("/chat", json=payload, headers=auth_context["headers"])

    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    resp = data["response"].lower()

    # Crisis support wording (adjust later if your exact message differs)
    assert ("help" in resp) or ("emergency" in resp) or ("safe" in resp)

    # Should not mention internal system terms
    assert "knowledge base" not in resp
    assert "kb" not in resp
