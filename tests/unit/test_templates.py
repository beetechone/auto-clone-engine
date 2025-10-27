"""Unit tests for template endpoints."""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from apps.api.src.main import app

client = TestClient(app)


class TestPublicTemplateEndpoints:
    """Test public template endpoints (no auth required)."""
    
    def test_list_templates_public(self):
        """Test that listing templates works without auth."""
        response = client.get("/templates")
        # Should return 200 even with no templates
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
    
    def test_list_templates_pagination(self):
        """Test that pagination parameters are accepted."""
        response = client.get("/templates?page=1&per_page=10")
        assert response.status_code == 200
    
    def test_list_templates_filtering(self):
        """Test that filtering parameters are accepted."""
        category_id = str(uuid4())
        response = client.get(f"/templates?category_id={category_id}&tag=business&search=test")
        assert response.status_code == 200
    
    def test_list_templates_sorting(self):
        """Test that sorting parameters are accepted."""
        response = client.get("/templates?sort_by=name&sort_order=asc")
        assert response.status_code == 200
    
    def test_list_categories_public(self):
        """Test that listing categories works without auth."""
        response = client.get("/templates/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
    
    def test_get_template_not_found(self):
        """Test getting non-existent template returns 404."""
        template_id = str(uuid4())
        response = client.get(f"/templates/{template_id}")
        assert response.status_code == 404


class TestAdminTemplateEndpoints:
    """Test admin template endpoints (auth required)."""
    
    def test_admin_list_templates_requires_auth(self):
        """Test that admin listing requires authentication."""
        response = client.get("/admin/templates")
        assert response.status_code == 401
    
    def test_admin_create_template_requires_auth(self):
        """Test that creating template requires authentication."""
        response = client.post("/admin/templates", json={
            "name": "Test Template",
            "type": "url",
            "payload_template": {"url": "{{url}}"},
            "options_template": {},
            "variables": {}
        })
        assert response.status_code == 401
    
    def test_admin_get_template_requires_auth(self):
        """Test that getting template as admin requires authentication."""
        template_id = str(uuid4())
        response = client.get(f"/admin/templates/{template_id}")
        assert response.status_code == 401
    
    def test_admin_update_template_requires_auth(self):
        """Test that updating template requires authentication."""
        template_id = str(uuid4())
        response = client.put(f"/admin/templates/{template_id}", json={
            "name": "Updated Name"
        })
        assert response.status_code == 401
    
    def test_admin_delete_template_requires_auth(self):
        """Test that deleting template requires authentication."""
        template_id = str(uuid4())
        response = client.delete(f"/admin/templates/{template_id}")
        assert response.status_code == 401
    
    def test_admin_publish_template_requires_auth(self):
        """Test that publishing template requires authentication."""
        template_id = str(uuid4())
        response = client.post(f"/admin/templates/{template_id}/publish")
        assert response.status_code == 401
    
    def test_admin_unpublish_template_requires_auth(self):
        """Test that unpublishing template requires authentication."""
        template_id = str(uuid4())
        response = client.post(f"/admin/templates/{template_id}/unpublish")
        assert response.status_code == 401
    
    def test_admin_upload_asset_requires_auth(self):
        """Test that uploading asset requires authentication."""
        response = client.post("/admin/templates/upload")
        assert response.status_code == 401
    
    def test_admin_create_category_requires_auth(self):
        """Test that creating category requires authentication."""
        response = client.post("/admin/templates/categories", json={
            "name": "Test Category",
            "slug": "test-category"
        })
        assert response.status_code == 401


class TestAPIRoutes:
    """Test that template routes are registered."""
    
    def test_template_routes_registered(self):
        """Test that template endpoints are accessible."""
        routes = [r.path for r in app.routes]
        
        # Public routes
        assert "/templates" in routes
        assert "/templates/categories" in routes
        assert "/templates/{template_id}" in routes
        
        # Admin routes
        assert "/admin/templates" in routes
        assert "/admin/templates/{template_id}" in routes
        assert "/admin/templates/{template_id}/publish" in routes
        assert "/admin/templates/{template_id}/unpublish" in routes
        assert "/admin/templates/upload" in routes
        assert "/admin/templates/categories" in routes


class TestValidation:
    """Test input validation."""
    
    def test_create_template_invalid_type(self):
        """Test that invalid template type is rejected."""
        response = client.post("/admin/templates", json={
            "name": "Test",
            "type": "invalid_type",
            "payload_template": {},
            "options_template": {}
        })
        # Should fail validation (401 or 422)
        assert response.status_code in [401, 422]
    
    def test_list_templates_invalid_sort_by(self):
        """Test that invalid sort_by parameter is rejected."""
        response = client.get("/templates?sort_by=invalid_field")
        # Should fail validation
        assert response.status_code == 422
    
    def test_list_templates_invalid_sort_order(self):
        """Test that invalid sort_order parameter is rejected."""
        response = client.get("/templates?sort_order=invalid")
        # Should fail validation
        assert response.status_code == 422
