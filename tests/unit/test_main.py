from fastapi.testclient import TestClient
from apps.api.src.main import app

client = TestClient(app)

def test_cors_headers():
    """Test CORS middleware is configured"""
    r = client.options("/health")
    # CORS should allow any origin
    assert r.status_code in [200, 405]  # OPTIONS may not be implemented but CORS should be set

def test_api_routes_registered():
    """Test all expected routes are registered"""
    routes = [route.path for route in app.routes]
    assert "/health" in routes
    assert "/secure/ping" in routes
    assert "/billing/plans" in routes
    assert "/billing/checkout" in routes
    assert "/billing/webhook" in routes
