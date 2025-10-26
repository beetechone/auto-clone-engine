from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .logging_config import setup_logging
from .auth import require_auth
from . import billing
from . import library
from .database import init_db

logger = setup_logging()
app = FastAPI(title="QR Cloner API", version="0.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        logger.info({"event": "database_initialized"})
    except Exception as e:
        logger.error({"event": "database_init_error", "error": str(e)})

@app.get("/health")
def health():
    logger.info({"event":"healthcheck"})
    return {"ok": True}

@app.get("/secure/ping")
def secure_ping(user=Depends(require_auth)):
    return {"ok": True, "sub": user.get("sub")}

app.include_router(billing.router)
app.include_router(library.router)
