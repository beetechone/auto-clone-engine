from fastapi.testclient import TestClient
from apps.api.src.main import app
from unittest.mock import patch, Mock
import stripe

client = TestClient(app)

def test_get_plans_returns_all_plans():
    """Test that all plan tiers are returned"""
    r = client.get("/billing/plans")
    plans = r.json()["plans"]
    
    plan_ids = [p["id"] for p in plans]
    assert "free" in plan_ids
    assert "pro" in plan_ids
    assert "team" in plan_ids

def test_checkout_missing_plan_id():
    """Test checkout without plan_id"""
    r = client.post("/billing/checkout", json={
        "success_url": "http://test.com/success",
        "cancel_url": "http://test.com/cancel"
    })
    assert r.status_code == 400

def test_checkout_uses_default_urls():
    """Test checkout with free plan uses success URL correctly"""
    r = client.post("/billing/checkout", json={
        "plan_id": "free"
    })
    assert r.status_code == 200
    data = r.json()
    assert "success" in data["url"]

@patch('stripe.checkout.Session.create')
def test_checkout_pro_plan(mock_create):
    """Test checkout with pro plan creates Stripe session"""
    mock_create.return_value = {
        "id": "cs_test_123",
        "url": "https://checkout.stripe.com/test"
    }
    
    r = client.post("/billing/checkout", json={
        "plan_id": "pro",
        "success_url": "http://test.com/success",
        "cancel_url": "http://test.com/cancel"
    })
    
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "cs_test_123"
    assert "stripe.com" in data["url"]
    
    # Verify Stripe was called
    mock_create.assert_called_once()

@patch('stripe.checkout.Session.create')
def test_checkout_stripe_error(mock_create):
    """Test checkout handles Stripe errors"""
    mock_create.side_effect = stripe.error.StripeError("Test error")
    
    r = client.post("/billing/checkout", json={
        "plan_id": "pro",
        "success_url": "http://test.com/success",
        "cancel_url": "http://test.com/cancel"
    })
    
    assert r.status_code == 500
    assert "Stripe error" in r.json()["detail"]

def test_webhook_invalid_payload():
    """Test webhook with invalid JSON"""
    r = client.post("/billing/webhook", 
                    content=b'invalid json',
                    headers={"stripe-signature": "test"})
    assert r.status_code == 400
