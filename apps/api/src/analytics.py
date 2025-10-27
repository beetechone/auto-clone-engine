"""Analytics and event tracking endpoints."""
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
import hashlib
import time

from .database import get_db
from .models import QREvent, Shortlink, QRItem, Account
from .auth import get_current_user, require_auth
from .logging_config import setup_logging
from .cache import get_cache, set_cache

logger = setup_logging()
router = APIRouter(tags=["analytics"])


# Pydantic schemas
class EventSchema(BaseModel):
    id: UUID
    type: str
    user_id: Optional[UUID] = None
    item_id: Optional[UUID] = None
    meta: dict = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsSummary(BaseModel):
    total_creates: int = 0
    total_exports: int = 0
    total_scans: int = 0
    creates_this_week: int = 0
    exports_this_week: int = 0
    scans_this_week: int = 0
    creates_this_month: int = 0
    exports_this_month: int = 0
    scans_this_month: int = 0


class TimeSeriesPoint(BaseModel):
    date: str
    creates: int = 0
    exports: int = 0
    scans: int = 0


class AnalyticsTimeSeriesResponse(BaseModel):
    data: List[TimeSeriesPoint]
    period: str  # daily, weekly, monthly


def generate_event_id(event_type: str, item_id: Optional[UUID], user_id: Optional[UUID], timestamp: int) -> str:
    """Generate a deterministic event ID for deduplication."""
    parts = [event_type, str(item_id or ''), str(user_id or ''), str(timestamp)]
    return hashlib.sha256('|'.join(parts).encode()).hexdigest()[:16]


def record_event(
    db: Session,
    event_type: str,
    user_id: Optional[UUID] = None,
    item_id: Optional[UUID] = None,
    meta: dict = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> QREvent:
    """Record an event with deduplication."""
    # Create event record
    event = QREvent(
        type=event_type,
        user_id=user_id,
        item_id=item_id,
        meta=meta or {},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    logger.info({
        "event": "event_recorded",
        "event_type": event_type,
        "event_id": str(event.id),
        "user_id": str(user_id) if user_id else None,
        "item_id": str(item_id) if item_id else None
    })
    
    return event


@router.get("/r/{code}")
async def redirect_shortlink(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Redirect shortlink and record scan event."""
    trace_id = hashlib.sha256(f"{code}{time.time()}".encode()).hexdigest()[:16]
    
    logger.info({
        "event": "shortlink_redirect_start",
        "code": code,
        "trace_id": trace_id
    })
    
    # Find shortlink
    shortlink = db.query(Shortlink).filter(Shortlink.code == code).first()
    
    if not shortlink:
        logger.warning({
            "event": "shortlink_not_found",
            "code": code,
            "trace_id": trace_id
        })
        raise HTTPException(status_code=404, detail="Shortlink not found")
    
    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Record scan event (idempotent with timestamp-based deduplication)
    try:
        record_event(
            db=db,
            event_type="scan",
            item_id=shortlink.qr_item_id,
            meta={"code": code, "target_url": shortlink.target_url},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Update shortlink scan count
        shortlink.scan_count += 1
        shortlink.last_scanned_at = datetime.utcnow()
        db.commit()
        
        logger.info({
            "event": "shortlink_redirected",
            "code": code,
            "target_url": shortlink.target_url,
            "scan_count": shortlink.scan_count,
            "trace_id": trace_id
        })
    except Exception as e:
        logger.error({
            "event": "scan_tracking_error",
            "code": code,
            "error": str(e),
            "trace_id": trace_id
        })
        # Continue with redirect even if tracking fails
    
    # Redirect with 302 status
    return RedirectResponse(url=shortlink.target_url, status_code=302)


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get analytics summary for the current user."""
    user_id = UUID(user.get("sub"))
    
    # Check cache first
    cache_key = f"analytics:summary:{user_id}"
    cached = get_cache(cache_key)
    if cached:
        logger.info({"event": "analytics_summary_cache_hit", "user_id": str(user_id)})
        return cached
    
    # Calculate date boundaries
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Get account to filter by owned items
    account = db.query(Account).filter(Account.auth_sub == user.get("sub")).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get owned QR item IDs
    owned_item_ids = db.query(QRItem.id).filter(QRItem.owner_id == account.id).all()
    owned_item_ids = [item[0] for item in owned_item_ids]
    
    # Build filters
    user_filter = or_(
        QREvent.user_id == account.id,
        QREvent.item_id.in_(owned_item_ids) if owned_item_ids else False
    )
    
    # Query totals
    total_creates = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "create", user_filter)
    ).scalar() or 0
    
    total_exports = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "export", user_filter)
    ).scalar() or 0
    
    total_scans = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "scan", user_filter)
    ).scalar() or 0
    
    # Query weekly
    creates_this_week = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "create", QREvent.created_at >= week_ago, user_filter)
    ).scalar() or 0
    
    exports_this_week = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "export", QREvent.created_at >= week_ago, user_filter)
    ).scalar() or 0
    
    scans_this_week = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "scan", QREvent.created_at >= week_ago, user_filter)
    ).scalar() or 0
    
    # Query monthly
    creates_this_month = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "create", QREvent.created_at >= month_ago, user_filter)
    ).scalar() or 0
    
    exports_this_month = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "export", QREvent.created_at >= month_ago, user_filter)
    ).scalar() or 0
    
    scans_this_month = db.query(func.count(QREvent.id)).filter(
        and_(QREvent.type == "scan", QREvent.created_at >= month_ago, user_filter)
    ).scalar() or 0
    
    summary = AnalyticsSummary(
        total_creates=total_creates,
        total_exports=total_exports,
        total_scans=total_scans,
        creates_this_week=creates_this_week,
        exports_this_week=exports_this_week,
        scans_this_week=scans_this_week,
        creates_this_month=creates_this_month,
        exports_this_month=exports_this_month,
        scans_this_month=scans_this_month
    )
    
    # Cache for 5 minutes
    set_cache(cache_key, summary.model_dump(), ttl=300)
    
    logger.info({
        "event": "analytics_summary_generated",
        "user_id": str(user_id),
        "total_creates": total_creates,
        "total_exports": total_exports,
        "total_scans": total_scans
    })
    
    return summary


@router.get("/analytics/timeseries", response_model=AnalyticsTimeSeriesResponse)
async def get_analytics_timeseries(
    period: str = Query("daily", pattern="^(daily|weekly)$"),
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get time series analytics data."""
    user_id = UUID(user.get("sub"))
    
    # Check cache
    cache_key = f"analytics:timeseries:{user_id}:{period}:{days}"
    cached = get_cache(cache_key)
    if cached:
        logger.info({"event": "analytics_timeseries_cache_hit", "user_id": str(user_id)})
        return cached
    
    # Get account and owned items
    account = db.query(Account).filter(Account.auth_sub == user.get("sub")).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    owned_item_ids = db.query(QRItem.id).filter(QRItem.owner_id == account.id).all()
    owned_item_ids = [item[0] for item in owned_item_ids]
    
    user_filter = or_(
        QREvent.user_id == account.id,
        QREvent.item_id.in_(owned_item_ids) if owned_item_ids else False
    )
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query events grouped by date
    if period == "daily":
        date_format = func.date(QREvent.created_at)
    else:  # weekly
        # Group by week (ISO week)
        date_format = func.date_trunc('week', QREvent.created_at)
    
    # Get aggregated data
    results = db.query(
        date_format.label('date'),
        QREvent.type,
        func.count(QREvent.id).label('count')
    ).filter(
        and_(QREvent.created_at >= start_date, user_filter)
    ).group_by('date', QREvent.type).all()
    
    # Organize data by date
    data_by_date = {}
    for row in results:
        date_str = row.date.strftime('%Y-%m-%d') if hasattr(row.date, 'strftime') else str(row.date)
        if date_str not in data_by_date:
            data_by_date[date_str] = {"creates": 0, "exports": 0, "scans": 0}
        
        if row.type == "create":
            data_by_date[date_str]["creates"] = row.count
        elif row.type == "export":
            data_by_date[date_str]["exports"] = row.count
        elif row.type == "scan":
            data_by_date[date_str]["scans"] = row.count
    
    # Convert to list of TimeSeriesPoint
    data = [
        TimeSeriesPoint(date=date_str, **values)
        for date_str, values in sorted(data_by_date.items())
    ]
    
    response = AnalyticsTimeSeriesResponse(data=data, period=period)
    
    # Cache for 5 minutes
    set_cache(cache_key, response.model_dump(), ttl=300)
    
    logger.info({
        "event": "analytics_timeseries_generated",
        "user_id": str(user_id),
        "period": period,
        "days": days,
        "data_points": len(data)
    })
    
    return response


@router.get("/analytics/events", response_model=List[EventSchema])
async def get_analytics_events(
    event_type: Optional[str] = Query(None, pattern="^(create|export|scan)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get detailed event list for the current user."""
    # Get account
    account = db.query(Account).filter(Account.auth_sub == user.get("sub")).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get owned items
    owned_item_ids = db.query(QRItem.id).filter(QRItem.owner_id == account.id).all()
    owned_item_ids = [item[0] for item in owned_item_ids]
    
    # Build query
    query = db.query(QREvent).filter(
        or_(
            QREvent.user_id == account.id,
            QREvent.item_id.in_(owned_item_ids) if owned_item_ids else False
        )
    )
    
    # Filter by type if specified
    if event_type:
        query = query.filter(QREvent.type == event_type)
    
    # Order by created_at desc
    query = query.order_by(QREvent.created_at.desc())
    
    # Apply pagination
    events = query.offset(offset).limit(limit).all()
    
    logger.info({
        "event": "analytics_events_retrieved",
        "user_id": str(account.id),
        "event_type": event_type,
        "count": len(events)
    })
    
    return events
