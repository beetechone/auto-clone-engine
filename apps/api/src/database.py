"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/qrdb")

# Create engine
engine = create_engine(DATABASE_URL, echo=False)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db() -> Session:
    """Dependency for FastAPI routes to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_context():
    """Context manager for database session (for non-FastAPI usage)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables."""
    # Import models to ensure they're registered with Base
    from . import models  # noqa
    Base.metadata.create_all(bind=engine)
