import pytest
from unittest.mock import Mock, patch, AsyncMock
from apps.api.src.auth import match_key

def test_match_key_found():
    """Test matching key by kid"""
    keys = {
        "keys": [
            {"kid": "key1", "kty": "RSA"},
            {"kid": "key2", "kty": "RSA"}
        ]
    }
    key = match_key(keys, "key2")
    assert key is not None
    assert key["kid"] == "key2"

def test_match_key_not_found():
    """Test matching key returns None when not found"""
    keys = {
        "keys": [
            {"kid": "key1", "kty": "RSA"}
        ]
    }
    key = match_key(keys, "nonexistent")
    assert key is None

def test_match_key_empty_keys():
    """Test matching key with empty keys list"""
    keys = {"keys": []}
    key = match_key(keys, "any")
    assert key is None

