from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.main import app
from app.database import get_db
from app.auth import SECRET_KEY, ALGORITHM
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from sqlalchemy.pool import StaticPool

from sqlalchemy import create_engine


TEST_DATABASE_URL = "sqlite://"



engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
            print(db.bind.url)


    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_context(client):
    response = client.post("/api/sessions/create")
    assert response.status_code == 200

    token = response.json()["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    session_id = payload["session_id"]

    return {
        "token": token,
        "session_id": session_id,
        "headers": {"Authorization": f"Bearer {token}"},
    }
