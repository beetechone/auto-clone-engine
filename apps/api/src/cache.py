"""Redis cache utilities for template gallery."""
import os
import redis
from typing import Optional
from .logging_config import setup_logging

logger = setup_logging()

# Redis client
_redis_client = None


def get_redis_client():
    """Get Redis client instance."""
    global _redis_client
    
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            _redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            _redis_client.ping()
            logger.info({"event": "redis_connected", "url": redis_url})
        except Exception as e:
            logger.warning({"event": "redis_connection_failed", "error": str(e)})
            _redis_client = None
    
    return _redis_client


def get_cache(key: str) -> Optional[str]:
    """Get value from cache."""
    client = get_redis_client()
    if not client:
        return None
    
    try:
        value = client.get(key)
        return value
    except Exception as e:
        logger.warning({"event": "cache_get_error", "key": key, "error": str(e)})
        return None


def set_cache(key: str, value: str, ttl: int = 300) -> bool:
    """Set value in cache with TTL in seconds."""
    client = get_redis_client()
    if not client:
        return False
    
    try:
        client.setex(key, ttl, value)
        return True
    except Exception as e:
        logger.warning({"event": "cache_set_error", "key": key, "error": str(e)})
        return False


def delete_cache(pattern: str) -> int:
    """Delete cache keys matching pattern."""
    client = get_redis_client()
    if not client:
        return 0
    
    try:
        # For pattern with *, use scan and delete
        if "*" in pattern:
            deleted = 0
            for key in client.scan_iter(match=pattern):
                client.delete(key)
                deleted += 1
            return deleted
        else:
            return client.delete(pattern)
    except Exception as e:
        logger.warning({"event": "cache_delete_error", "pattern": pattern, "error": str(e)})
        return 0
