from fastapi.testclient import TestClient
from apps.api.src.main import app
import pytest

client = TestClient(app)

def test_health():
    """Test /health endpoint returns OK"""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True

def test_secure_ping_without_auth():
    """Test /secure/ping requires authentication"""
    r = client.get("/secure/ping")
    assert r.status_code == 401

def test_billing_plans():
    """Test /billing/plans returns plan list"""
    r = client.get("/billing/plans")
    assert r.status_code == 200
    data = r.json()
    assert "plans" in data
    assert len(data["plans"]) >= 3  # free, pro, team

def test_billing_plans_structure():
    """Test billing plans have correct structure"""
    r = client.get("/billing/plans")
    plans = r.json()["plans"]
    
    for plan in plans:
        assert "id" in plan
        assert "name" in plan
        assert "price" in plan
        assert "quota" in plan
        assert "qr_month" in plan["quota"]

def test_billing_checkout_invalid_plan():
    """Test checkout with invalid plan returns 400"""
    r = client.post("/billing/checkout", json={
        "plan_id": "nonexistent",
        "success_url": "http://test.com/success",
        "cancel_url": "http://test.com/cancel"
    })
    assert r.status_code == 400

def test_billing_checkout_free_plan():
    """Test checkout with free plan returns success URL"""
    r = client.post("/billing/checkout", json={
        "plan_id": "free",
        "success_url": "http://test.com/success",
        "cancel_url": "http://test.com/cancel"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "free"
    assert data["url"] == "http://test.com/success"

def test_stripe_webhook_without_signature():
    """Test webhook rejects requests without signature"""
    r = client.post("/billing/webhook", content=b'{"type":"test"}')
    assert r.status_code == 400
