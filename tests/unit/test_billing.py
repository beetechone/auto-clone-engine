from fastapi.testclient import TestClient
from apps.api.src.main import app

def test_plans():
  c = TestClient(app)
  r = c.get("/billing/plans")
  assert r.status_code == 200 and "plans" in r.json()
