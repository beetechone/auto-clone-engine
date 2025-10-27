"""Unit tests for Stripe webhook handling and billing events."""
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock, MagicMock
from datetime import datetime, timedelta
import json

from apps.api.src.main import app
from apps.api.src.models import Account, BillingEvent, UsageQuota
from apps.api.src.database import get_db, Base, engine

client = TestClient(app)


def test_webhook_checkout_completed():
    """Test checkout.session.completed webhook processing."""
    event_data = {
        "id": "evt_test_checkout_completed",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "customer": "cus_test_123",
                "subscription": "sub_test_123",
                "metadata": {
                    "account_id": "550e8400-e29b-41d4-a716-446655440000",
                    "plan_id": "pro"
                }
            }
        }
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        with patch('stripe.Subscription.retrieve') as mock_sub:
            mock_webhook.return_value = event_data
            mock_sub.return_value = Mock(current_period_end=datetime.now().timestamp() + 2592000)
            
            response = client.post(
                "/billing/webhook",
                json=event_data,
                headers={"stripe-signature": "test_sig"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] == True


def test_webhook_invalid_signature():
    """Test webhook with invalid signature is rejected."""
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        mock_webhook.side_effect = Exception("Invalid signature")
        
        response = client.post(
            "/billing/webhook",
            json={"type": "test"},
            headers={"stripe-signature": "invalid"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["ok"] == False


def test_webhook_duplicate_event():
    """Test webhook with duplicate event ID is handled gracefully."""
    event_data = {
        "id": "evt_test_duplicate",
        "type": "checkout.session.completed",
        "data": {"object": {}}
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        mock_webhook.return_value = event_data
        
        # First request
        response1 = client.post(
            "/billing/webhook",
            json=event_data,
            headers={"stripe-signature": "test_sig"}
        )
        
        # Second request (duplicate)
        response2 = client.post(
            "/billing/webhook",
            json=event_data,
            headers={"stripe-signature": "test_sig"}
        )
        
        assert response2.status_code == 200
        data = response2.json()
        assert data.get("duplicate") == True


def test_webhook_invoice_payment_succeeded():
    """Test invoice.payment_succeeded webhook."""
    event_data = {
        "id": "evt_test_invoice_succeeded",
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "id": "in_test_123",
                "customer": "cus_test_123",
                "subscription": "sub_test_123"
            }
        }
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        with patch('stripe.Subscription.retrieve') as mock_sub:
            mock_webhook.return_value = event_data
            mock_sub.return_value = Mock(current_period_end=datetime.now().timestamp() + 2592000)
            
            response = client.post(
                "/billing/webhook",
                json=event_data,
                headers={"stripe-signature": "test_sig"}
            )
            
            assert response.status_code == 200


def test_webhook_invoice_payment_failed():
    """Test invoice.payment_failed webhook."""
    event_data = {
        "id": "evt_test_invoice_failed",
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "id": "in_test_456",
                "customer": "cus_test_123"
            }
        }
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        mock_webhook.return_value = event_data
        
        response = client.post(
            "/billing/webhook",
            json=event_data,
            headers={"stripe-signature": "test_sig"}
        )
        
        assert response.status_code == 200


def test_webhook_subscription_updated():
    """Test customer.subscription.updated webhook."""
    event_data = {
        "id": "evt_test_sub_updated",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_123",
                "customer": "cus_test_123",
                "status": "active",
                "current_period_end": int(datetime.now().timestamp()) + 2592000,
                "items": {
                    "data": [
                        {
                            "price": {
                                "unit_amount": 990
                            }
                        }
                    ]
                }
            }
        }
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        mock_webhook.return_value = event_data
        
        response = client.post(
            "/billing/webhook",
            json=event_data,
            headers={"stripe-signature": "test_sig"}
        )
        
        assert response.status_code == 200


def test_webhook_subscription_deleted():
    """Test customer.subscription.deleted webhook."""
    event_data = {
        "id": "evt_test_sub_deleted",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_test_123",
                "customer": "cus_test_123"
            }
        }
    }
    
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        mock_webhook.return_value = event_data
        
        response = client.post(
            "/billing/webhook",
            json=event_data,
            headers={"stripe-signature": "test_sig"}
        )
        
        assert response.status_code == 200


def test_webhook_no_secret_configured():
    """Test webhook when STRIPE_WEBHOOK_SECRET is not set."""
    with patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': ''}, clear=False):
        response = client.post(
            "/billing/webhook",
            json={"type": "test"},
            headers={"stripe-signature": "test_sig"}
        )
        
        # Should succeed but log warning
        assert response.status_code == 200


def test_get_plans_includes_quotas():
    """Test that /billing/plans includes quota information."""
    response = client.get("/billing/plans")
    assert response.status_code == 200
    
    data = response.json()
    plans = data["plans"]
    
    # Check all plans have quotas
    for plan in plans:
        assert "quota" in plan
        assert "qr_month" in plan["quota"]
        assert "exports_day" in plan["quota"]
        assert "templates_apply" in plan["quota"]
    
    # Check Free plan
    free_plan = next(p for p in plans if p["id"] == "free")
    assert free_plan["quota"]["qr_month"] == 50
    assert free_plan["quota"]["exports_day"] == 10
    
    # Check Pro plan
    pro_plan = next(p for p in plans if p["id"] == "pro")
    assert pro_plan["quota"]["qr_month"] == 1000
    assert pro_plan["quota"]["exports_day"] == 100
    
    # Check Team plan
    team_plan = next(p for p in plans if p["id"] == "team")
    assert team_plan["quota"]["qr_month"] == 10000
    assert team_plan["quota"]["exports_day"] == 1000


def test_get_plans_includes_features():
    """Test that /billing/plans includes feature lists."""
    response = client.get("/billing/plans")
    assert response.status_code == 200
    
    data = response.json()
    plans = data["plans"]
    
    for plan in plans:
        assert "features" in plan
        assert isinstance(plan["features"], list)
        assert len(plan["features"]) > 0


def test_checkout_with_metadata():
    """Test checkout session includes account and plan metadata."""
    with patch('stripe.checkout.Session.create') as mock_create:
        with patch('stripe.Customer.create') as mock_customer:
            mock_customer.return_value = Mock(id="cus_new_123")
            mock_create.return_value = {
                "id": "cs_test_metadata",
                "url": "https://checkout.stripe.com/test"
            }
            
            # Mock authentication
            with patch('apps.api.src.auth.require_auth') as mock_auth:
                mock_auth.return_value = {
                    "sub": "auth0|test123",
                    "email": "test@example.com"
                }
                
                response = client.post(
                    "/billing/checkout",
                    json={
                        "plan_id": "pro",
                        "success_url": "http://test.com/success",
                        "cancel_url": "http://test.com/cancel"
                    },
                    headers={"Authorization": "Bearer test_token"}
                )
                
                assert response.status_code == 200
                
                # Verify metadata was included
                call_args = mock_create.call_args
                assert call_args is not None
                metadata = call_args[1].get("metadata", {})
                assert "account_id" in metadata
                assert "plan_id" in metadata
                assert metadata["plan_id"] == "pro"
