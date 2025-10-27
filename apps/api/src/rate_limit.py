"""Rate limiting middleware using Redis."""
import os
import time
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from .cache import get_redis_client
from .logging_config import setup_logging

logger = setup_logging()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with configurable limits per endpoint."""
    
    def __init__(self, app, default_limit: int = 100, default_window: int = 60):
        super().__init__(app)
        self.default_limit = default_limit  # requests per window
        self.default_window = default_window  # window in seconds
        
        # Endpoint-specific limits (requests per minute)
        self.endpoint_limits = {
            "/r/": (200, 60),  # 200 redirects per minute
            "/analytics/": (60, 60),  # 60 analytics requests per minute
            "/library/": (120, 60),  # 120 library requests per minute
            "/billing/checkout": (10, 60),  # 10 checkouts per minute
            "/health": (1000, 60),  # 1000 health checks per minute
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        # Skip rate limiting if Redis is not available
        redis_client = get_redis_client()
        if not redis_client:
            return await call_next(request)
        
        # Get client identifier (IP address)
        client_ip = request.client.host if request.client else "unknown"
        
        # Get endpoint path
        path = request.url.path
        
        # Determine rate limit for this endpoint
        limit, window = self.default_limit, self.default_window
        for endpoint_prefix, (ep_limit, ep_window) in self.endpoint_limits.items():
            if path.startswith(endpoint_prefix):
                limit, window = ep_limit, ep_window
                break
        
        # Create rate limit key
        current_window = int(time.time()) // window
        key = f"ratelimit:{client_ip}:{path}:{current_window}"
        
        try:
            # Increment counter
            count = redis_client.incr(key)
            
            # Set expiry on first increment
            if count == 1:
                redis_client.expire(key, window)
            
            # Check if limit exceeded
            if count > limit:
                logger.warning({
                    "event": "rate_limit_exceeded",
                    "client_ip": client_ip,
                    "path": path,
                    "count": count,
                    "limit": limit
                })
                
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded. Maximum {limit} requests per {window} seconds.",
                        "retry_after": window
                    }
                )
            
            # Add rate limit headers
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
            response.headers["X-RateLimit-Reset"] = str((current_window + 1) * window)
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error({
                "event": "rate_limit_error",
                "client_ip": client_ip,
                "path": path,
                "error": str(e)
            })
            # Continue without rate limiting on error
            return await call_next(request)


def check_rate_limit(key: str, limit: int, window: int) -> tuple[bool, int]:
    """
    Check rate limit for a given key.
    
    Args:
        key: Unique identifier for the rate limit (e.g., "user:123:action")
        limit: Maximum number of requests allowed in the window
        window: Time window in seconds
    
    Returns:
        Tuple of (allowed: bool, remaining: int)
    """
    redis_client = get_redis_client()
    if not redis_client:
        return True, limit  # Allow if Redis unavailable
    
    try:
        current_window = int(time.time()) // window
        rate_key = f"ratelimit:{key}:{current_window}"
        
        count = redis_client.incr(rate_key)
        if count == 1:
            redis_client.expire(rate_key, window)
        
        allowed = count <= limit
        remaining = max(0, limit - count)
        
        return allowed, remaining
        
    except Exception as e:
        logger.error({"event": "rate_limit_check_error", "key": key, "error": str(e)})
        return True, limit  # Allow on error
