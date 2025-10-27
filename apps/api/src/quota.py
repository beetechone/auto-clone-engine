"""Quota enforcement middleware for API endpoints."""
from datetime import datetime, timedelta
from functools import wraps
from typing import Callable
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from loguru import logger

from .database import get_db
from .models import Account, UsageQuota
from .billing import get_quota_for_plan


def get_or_create_quota(db: Session, account: Account) -> UsageQuota:
    """Get or create current period usage quota for account."""
    now = datetime.utcnow()
    
    # Check if daily reset is needed
    current_quota = db.query(UsageQuota).filter(
        UsageQuota.account_id == account.id,
        UsageQuota.period_start <= now,
        UsageQuota.period_end >= now
    ).first()
    
    if current_quota:
        # Check if daily counters need reset
        if current_quota.daily_reset_at.date() < now.date():
            current_quota.daily_exports = 0
            current_quota.daily_reset_at = now
            db.commit()
        return current_quota
    
    # Create new quota for current month
    period_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        period_end = datetime(now.year + 1, 1, 1) - timedelta(seconds=1)
    else:
        period_end = datetime(now.year, now.month + 1, 1) - timedelta(seconds=1)
    
    new_quota = UsageQuota(
        account_id=account.id,
        period_start=period_start,
        period_end=period_end,
        qr_generated_count=0,
        exports_count=0,
        templates_applied_count=0,
        daily_exports=0,
        daily_reset_at=now
    )
    db.add(new_quota)
    db.commit()
    db.refresh(new_quota)
    
    return new_quota


def check_qr_quota(account: Account, db: Session) -> bool:
    """Check if account can generate more QR codes."""
    quota = get_or_create_quota(db, account)
    limits = get_quota_for_plan(account.plan)
    
    if quota.qr_generated_count >= limits["qr_month"]:
        logger.warning({
            "event": "quota_exceeded",
            "account_id": str(account.id),
            "quota_type": "qr_month",
            "limit": limits["qr_month"],
            "current": quota.qr_generated_count
        })
        return False
    
    return True


def check_export_quota(account: Account, db: Session) -> bool:
    """Check if account can export more QR codes today."""
    quota = get_or_create_quota(db, account)
    limits = get_quota_for_plan(account.plan)
    
    if quota.daily_exports >= limits["exports_day"]:
        logger.warning({
            "event": "quota_exceeded",
            "account_id": str(account.id),
            "quota_type": "exports_day",
            "limit": limits["exports_day"],
            "current": quota.daily_exports
        })
        return False
    
    return True


def check_template_quota(account: Account, db: Session) -> bool:
    """Check if account can apply more templates."""
    quota = get_or_create_quota(db, account)
    limits = get_quota_for_plan(account.plan)
    
    if quota.templates_applied_count >= limits["templates_apply"]:
        logger.warning({
            "event": "quota_exceeded",
            "account_id": str(account.id),
            "quota_type": "templates_apply",
            "limit": limits["templates_apply"],
            "current": quota.templates_applied_count
        })
        return False
    
    return True


def increment_qr_quota(account: Account, db: Session):
    """Increment QR generation counter."""
    quota = get_or_create_quota(db, account)
    quota.qr_generated_count += 1
    db.commit()
    
    logger.info({
        "event": "quota_incremented",
        "account_id": str(account.id),
        "quota_type": "qr_generated",
        "new_count": quota.qr_generated_count
    })


def increment_export_quota(account: Account, db: Session):
    """Increment export counter."""
    quota = get_or_create_quota(db, account)
    quota.exports_count += 1
    quota.daily_exports += 1
    db.commit()
    
    logger.info({
        "event": "quota_incremented",
        "account_id": str(account.id),
        "quota_type": "export",
        "daily_count": quota.daily_exports,
        "total_count": quota.exports_count
    })


def increment_template_quota(account: Account, db: Session):
    """Increment template application counter."""
    quota = get_or_create_quota(db, account)
    quota.templates_applied_count += 1
    db.commit()
    
    logger.info({
        "event": "quota_incremented",
        "account_id": str(account.id),
        "quota_type": "templates_applied",
        "new_count": quota.templates_applied_count
    })


def enforce_qr_quota(user: dict, db: Session = Depends(get_db)):
    """Dependency to enforce QR generation quota."""
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not check_qr_quota(account, db):
        limits = get_quota_for_plan(account.plan)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"Monthly QR generation limit reached ({limits['qr_month']}). Please upgrade your plan.",
                "quota_type": "qr_month",
                "limit": limits["qr_month"],
                "upgrade_url": "/pricing"
            }
        )
    
    return account


def enforce_export_quota(user: dict, db: Session = Depends(get_db)):
    """Dependency to enforce export quota."""
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not check_export_quota(account, db):
        limits = get_quota_for_plan(account.plan)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"Daily export limit reached ({limits['exports_day']}). Please upgrade your plan or try again tomorrow.",
                "quota_type": "exports_day",
                "limit": limits["exports_day"],
                "upgrade_url": "/pricing"
            }
        )
    
    return account


def enforce_template_quota(user: dict, db: Session = Depends(get_db)):
    """Dependency to enforce template application quota."""
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not check_template_quota(account, db):
        limits = get_quota_for_plan(account.plan)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"Template application limit reached ({limits['templates_apply']}). Please upgrade your plan.",
                "quota_type": "templates_apply",
                "limit": limits["templates_apply"],
                "upgrade_url": "/pricing"
            }
        )
    
    return account
