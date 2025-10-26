from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .logging_config import setup_logging
from .auth import require_auth
from . import billing
from . import library
from .database import init_db

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


app = FastAPI(title="QR Cloner API", version="0.3.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    logger.info({"event":"healthcheck"})
    return {"ok": True}

@app.get("/secure/ping")
def secure_ping(user=Depends(require_auth)):
    return {"ok": True, "sub": user.get("sub")}

app.include_router(billing.router)
app.include_router(library.router)
