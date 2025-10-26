from fastapi.testclient import TestClient
from apps.api.src.main import app

def test_health():
  c = TestClient(app)
  r = c.get("/health")
  assert r.status_code == 200 and r.json().get("ok") is True

def test_app_metadata():
  """Test app metadata is properly configured"""
  assert app.title == "QR Cloner API"
  assert app.version == "0.2.0"
