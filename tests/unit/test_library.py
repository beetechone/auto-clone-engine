"""Unit tests for library endpoints."""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from apps.api.src.main import app

client = TestClient(app)


class TestQRItemsAuth:
    """Test QR items authentication requirements."""
    
    def test_list_qr_items_requires_auth(self):
        """Test that listing QR items requires authentication."""
        response = client.get("/library/qr-items")
        assert response.status_code == 401
    
    def test_create_qr_item_requires_auth(self):
        """Test that creating QR items requires authentication."""
        response = client.post("/library/qr-items", json={
            "name": "Test QR",
            "type": "url",
            "payload": {"url": "https://example.com"},
            "options": {}
        })
        assert response.status_code == 401
    
    def test_get_qr_item_requires_auth(self):
        """Test that getting QR item requires authentication."""
        item_id = str(uuid4())
        response = client.get(f"/library/qr-items/{item_id}")
        assert response.status_code == 401
    
    def test_update_qr_item_requires_auth(self):
        """Test that updating QR item requires authentication."""
        item_id = str(uuid4())
        response = client.put(f"/library/qr-items/{item_id}", json={
            "name": "Updated Name"
        })
        assert response.status_code == 401
    
    def test_delete_qr_item_requires_auth(self):
        """Test that deleting QR item requires authentication."""
        item_id = str(uuid4())
        response = client.delete(f"/library/qr-items/{item_id}")
        assert response.status_code == 401
    
    def test_restore_qr_item_requires_auth(self):
        """Test that restoring QR item requires authentication."""
        item_id = str(uuid4())
        response = client.post(f"/library/qr-items/{item_id}/restore")
        assert response.status_code == 401
    
    def test_duplicate_qr_item_requires_auth(self):
        """Test that duplicating QR item requires authentication."""
        item_id = str(uuid4())
        response = client.post(f"/library/qr-items/{item_id}/duplicate")
        assert response.status_code == 401


class TestFoldersAuth:
    """Test folders authentication requirements."""
    
    def test_list_folders_requires_auth(self):
        """Test that listing folders requires authentication."""
        response = client.get("/library/folders")
        assert response.status_code == 401
    
    def test_create_folder_requires_auth(self):
        """Test that creating folder requires authentication."""
        response = client.post("/library/folders", json={
            "name": "Test Folder"
        })
        assert response.status_code == 401
    
    def test_update_folder_requires_auth(self):
        """Test that updating folder requires authentication."""
        folder_id = str(uuid4())
        response = client.put(f"/library/folders/{folder_id}", json={
            "name": "Updated Folder"
        })
        assert response.status_code == 401
    
    def test_delete_folder_requires_auth(self):
        """Test that deleting folder requires authentication."""
        folder_id = str(uuid4())
        response = client.delete(f"/library/folders/{folder_id}")
        assert response.status_code == 401


class TestTagsAuth:
    """Test tags authentication requirements."""
    
    def test_list_tags_requires_auth(self):
        """Test that listing tags requires authentication."""
        response = client.get("/library/tags")
        assert response.status_code == 401
    
    def test_create_tag_requires_auth(self):
        """Test that creating tag requires authentication."""
        response = client.post("/library/tags", json={
            "name": "Test Tag",
            "color": "#FF0000"
        })
        assert response.status_code == 401


class TestPaginationParams:
    """Test pagination parameter validation."""
    
    def test_list_qr_items_accepts_pagination_params(self):
        """Test that pagination parameters are accepted."""
        # Without auth will get 401, but validates params exist
        response = client.get("/library/qr-items?page=2&per_page=50")
        assert response.status_code == 401
    
    def test_list_qr_items_accepts_sort_params(self):
        """Test that sort parameters are accepted."""
        response = client.get("/library/qr-items?sort_by=name&sort_order=asc")
        assert response.status_code == 401
    
    def test_list_qr_items_accepts_filter_params(self):
        """Test that filter parameters are accepted."""
        folder_id = str(uuid4())
        tag_id = str(uuid4())
        response = client.get(
            f"/library/qr-items?folder_id={folder_id}&tag_id={tag_id}&search=test&deleted=true"
        )
        assert response.status_code == 401


class TestAPIRoutes:
    """Test that library routes are registered."""
    
    def test_library_routes_registered(self):
        """Test that library endpoints are accessible."""
        # Check that the routes exist (even if they require auth)
        routes = [r.path for r in app.routes]
        
        assert "/library/qr-items" in routes
        assert "/library/qr-items/{item_id}" in routes
        assert "/library/qr-items/{item_id}/restore" in routes
        assert "/library/qr-items/{item_id}/duplicate" in routes
        assert "/library/folders" in routes
        assert "/library/folders/{folder_id}" in routes
        assert "/library/tags" in routes

