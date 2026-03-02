import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure fyp-backend/ is on Python path so `import app...` works
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)
