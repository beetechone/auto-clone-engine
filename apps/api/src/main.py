from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .logging_config import setup_logging
from .auth import require_auth
from . import billing
from . import library
from . import templates
from . import analytics
from .database import init_db
from .rate_limit import RateLimitMiddleware

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup
    try:
        init_db()
        logger.info({"event": "database_initialized"})
    except Exception as e:
        logger.error({"event": "database_init_error", "error": str(e)})
    
    yield
    
    # Shutdown (if needed)
    pass


app = FastAPI(title="QR Cloner API", version="0.4.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware, default_limit=100, default_window=60)

@app.get("/health")
def health():
    logger.info({"event":"healthcheck"})
    return {"ok": True}

@app.get("/secure/ping")
def secure_ping(user=Depends(require_auth)):
    return {"ok": True, "sub": user.get("sub")}

app.include_router(billing.router)
app.include_router(library.router)
app.include_router(templates.public_router)
app.include_router(templates.admin_router)
app.include_router(analytics.router)
