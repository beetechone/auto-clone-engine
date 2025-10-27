"""Billing and subscription management with Stripe integration."""
import stripe
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from loguru import logger

from .database import get_db
from .models import Account, BillingEvent, UsageQuota
from .auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

# Plan definitions with detailed quotas
PLANS = [
    {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "usd",
        "quota": {
            "qr_month": 50,
            "exports_day": 10,
            "templates_apply": 5
        },
        "features": ["50 QR codes per month", "10 exports per day", "Basic templates"]
    },
    {
        "id": "pro",
        "name": "Pro",
        "price": 990,
        "currency": "usd",
        "interval": "month",
        "quota": {
            "qr_month": 1000,
            "exports_day": 100,
            "templates_apply": 100
        },
        "features": ["1,000 QR codes per month", "100 exports per day", "All templates", "Priority support"]
    },
    {
        "id": "team",
        "name": "Team",
        "price": 2990,
        "currency": "usd",
        "interval": "month",
        "quota": {
            "qr_month": 10000,
            "exports_day": 1000,
            "templates_apply": 1000
        },
        "features": ["10,000 QR codes per month", "1,000 exports per day", "All templates", "Team collaboration", "Priority support"]
    },
]


def get_plan_by_id(plan_id: str) -> Optional[dict]:
    """Get plan configuration by ID."""
    return next((p for p in PLANS if p["id"] == plan_id), None)


def get_quota_for_plan(plan_id: str) -> dict:
    """Get quota limits for a given plan."""
    plan = get_plan_by_id(plan_id)
    if plan:
        return plan["quota"]
    return PLANS[0]["quota"]  # Default to free plan


@router.get("/plans")
def get_plans():
    """List all available subscription plans with quotas and features."""
    logger.info({"event": "billing_plans_requested"})
    return {"plans": PLANS}


@router.post("/checkout")
async def create_checkout_session(
    req: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe checkout session for plan subscription."""
    body = await req.json()
    plan_id = body.get("plan_id")
    success_url = body.get("success_url", "http://localhost:3000/success")
    cancel_url = body.get("cancel_url", "http://localhost:3000/cancel")
    
    plan = get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan_id")
    
    # Get or create account
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        account = Account(
            email=user.get("email", f"user-{user['sub']}@example.com"),
            auth_sub=user["sub"],
            plan="free"
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    
    try:
        if plan["price"] == 0:
            # Free plan - just update account
            account.plan = "free"
            account.subscription_status = "free"
            db.commit()
            logger.info({"event": "checkout_free_plan", "account_id": str(account.id)})
            return {"id": "free", "url": success_url}
        
        # Create or get Stripe customer
        if not account.stripe_customer_id:
            customer = stripe.Customer.create(
                email=account.email,
                metadata={"account_id": str(account.id)}
            )
            account.stripe_customer_id = customer.id
            db.commit()
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=account.stripe_customer_id,
            mode="subscription",
            line_items=[{
                "price_data": {
                    "currency": plan["currency"],
                    "unit_amount": plan["price"],
                    "product_data": {
                        "name": f"QR Cloner — {plan['name']}",
                        "description": ", ".join(plan["features"])
                    },
                    "recurring": {"interval": plan.get("interval", "month")},
                },
                "quantity": 1
            }],
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "account_id": str(account.id),
                "plan_id": plan_id
            }
        )
        
        logger.info({
            "event": "checkout_session_created",
            "account_id": str(account.id),
            "session_id": session.id,
            "plan_id": plan_id
        })
        
        return {"id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error({"event": "stripe_checkout_error", "error": str(e)})
        raise HTTPException(status_code=500, detail="Stripe error")


@router.get("/subscription")
async def get_subscription(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription status and usage."""
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get current period usage
    now = datetime.utcnow()
    current_quota = db.query(UsageQuota).filter(
        UsageQuota.account_id == account.id,
        UsageQuota.period_start <= now,
        UsageQuota.period_end >= now
    ).first()
    
    quota_limits = get_quota_for_plan(account.plan)
    
    usage = {
        "qr_generated": current_quota.qr_generated_count if current_quota else 0,
        "exports_today": current_quota.daily_exports if current_quota else 0,
        "templates_applied": current_quota.templates_applied_count if current_quota else 0
    }
    
    return {
        "plan": account.plan,
        "status": account.subscription_status,
        "current_period_end": account.subscription_current_period_end.isoformat() if account.subscription_current_period_end else None,
        "quota_limits": quota_limits,
        "usage": usage
    }


@router.post("/portal")
async def create_portal_session(
    req: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe customer portal session for subscription management."""
    body = await req.json()
    return_url = body.get("return_url", "http://localhost:3000/dashboard")
    
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account or not account.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=account.stripe_customer_id,
            return_url=return_url
        )
        
        logger.info({
            "event": "portal_session_created",
            "account_id": str(account.id),
            "session_id": session.id
        })
        
        return {"url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error({"event": "stripe_portal_error", "error": str(e)})
        raise HTTPException(status_code=500, detail="Stripe error")


@router.get("/usage")
async def get_usage(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed usage statistics for the current billing period."""
    account = db.query(Account).filter(Account.auth_sub == user["sub"]).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    now = datetime.utcnow()
    current_quota = db.query(UsageQuota).filter(
        UsageQuota.account_id == account.id,
        UsageQuota.period_start <= now,
        UsageQuota.period_end >= now
    ).first()
    
    if not current_quota:
        # Initialize quota for current period
        period_start = datetime(now.year, now.month, 1)
        if now.month == 12:
            period_end = datetime(now.year + 1, 1, 1) - timedelta(seconds=1)
        else:
            period_end = datetime(now.year, now.month + 1, 1) - timedelta(seconds=1)
        
        current_quota = UsageQuota(
            account_id=account.id,
            period_start=period_start,
            period_end=period_end,
            qr_generated_count=0,
            exports_count=0,
            templates_applied_count=0,
            daily_exports=0
        )
        db.add(current_quota)
        db.commit()
        db.refresh(current_quota)
    
    quota_limits = get_quota_for_plan(account.plan)
    
    return {
        "period_start": current_quota.period_start.isoformat(),
        "period_end": current_quota.period_end.isoformat(),
        "usage": {
            "qr_generated": {
                "count": current_quota.qr_generated_count,
                "limit": quota_limits["qr_month"],
                "percentage": min(100, (current_quota.qr_generated_count / quota_limits["qr_month"]) * 100)
            },
            "exports_today": {
                "count": current_quota.daily_exports,
                "limit": quota_limits["exports_day"],
                "percentage": min(100, (current_quota.daily_exports / quota_limits["exports_day"]) * 100)
            },
            "templates_applied": {
                "count": current_quota.templates_applied_count,
                "limit": quota_limits["templates_apply"],
                "percentage": min(100, (current_quota.templates_applied_count / quota_limits["templates_apply"]) * 100)
            }
        }
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events for subscription lifecycle."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    if not secret:
        logger.warning({"event": "webhook_no_secret", "warning": "STRIPE_WEBHOOK_SECRET not set"})
        return JSONResponse(status_code=200, content={"ok": True})
    
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except ValueError as e:
        logger.error({"event": "stripe_webhook_invalid_payload", "error": str(e)})
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid payload"})
    except stripe.error.SignatureVerificationError as e:
        logger.error({"event": "stripe_webhook_invalid_signature", "error": str(e)})
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid signature"})
    
    event_id = event["id"]
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    # Check for duplicate events
    existing_event = db.query(BillingEvent).filter(BillingEvent.stripe_event_id == event_id).first()
    if existing_event:
        logger.info({"event": "webhook_duplicate", "event_id": event_id})
        return JSONResponse(status_code=200, content={"ok": True, "duplicate": True})
    
    # Log the event
    logger.info({
        "event": "stripe_webhook_received",
        "event_type": event_type,
        "event_id": event_id
    })
    
    # Process webhook based on type
    try:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(db, event_data)
        elif event_type == "invoice.payment_succeeded":
            await handle_invoice_payment_succeeded(db, event_data)
        elif event_type == "invoice.payment_failed":
            await handle_invoice_payment_failed(db, event_data)
        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(db, event_data)
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(db, event_data)
        
        # Record successful processing
        billing_event = BillingEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            event_data=event_data,
            processed=True
        )
        db.add(billing_event)
        db.commit()
        
        return JSONResponse(status_code=200, content={"ok": True})
        
    except Exception as e:
        logger.error({
            "event": "webhook_processing_error",
            "event_type": event_type,
            "error": str(e)
        })
        
        # Record failed processing
        billing_event = BillingEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            event_data=event_data,
            processed=False,
            error_message=str(e)
        )
        db.add(billing_event)
        db.commit()
        
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


async def handle_checkout_completed(db: Session, session_data: dict):
    """Handle successful checkout session completion."""
    customer_id = session_data.get("customer")
    subscription_id = session_data.get("subscription")
    metadata = session_data.get("metadata", {})
    account_id = metadata.get("account_id")
    plan_id = metadata.get("plan_id")
    
    if not account_id:
        logger.error({"event": "checkout_no_account_id", "session": session_data.get("id")})
        return
    
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        logger.error({"event": "checkout_account_not_found", "account_id": account_id})
        return
    
    # Update account with subscription details
    account.stripe_customer_id = customer_id
    account.stripe_subscription_id = subscription_id
    account.plan = plan_id or "pro"
    account.subscription_status = "active"
    
    # Get subscription details for period end
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        account.subscription_current_period_end = datetime.fromtimestamp(subscription.current_period_end)
    
    db.commit()
    
    logger.info({
        "event": "checkout_completed",
        "account_id": str(account.id),
        "plan": account.plan,
        "subscription_id": subscription_id
    })
    
    # TODO: Send receipt email via Mailhog


async def handle_invoice_payment_succeeded(db: Session, invoice_data: dict):
    """Handle successful invoice payment."""
    customer_id = invoice_data.get("customer")
    subscription_id = invoice_data.get("subscription")
    
    account = db.query(Account).filter(Account.stripe_customer_id == customer_id).first()
    if not account:
        logger.error({"event": "invoice_account_not_found", "customer_id": customer_id})
        return
    
    # Update subscription status to active
    account.subscription_status = "active"
    
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        account.subscription_current_period_end = datetime.fromtimestamp(subscription.current_period_end)
    
    db.commit()
    
    logger.info({
        "event": "invoice_payment_succeeded",
        "account_id": str(account.id),
        "invoice_id": invoice_data.get("id")
    })
    
    # TODO: Send receipt email via Mailhog


async def handle_invoice_payment_failed(db: Session, invoice_data: dict):
    """Handle failed invoice payment."""
    customer_id = invoice_data.get("customer")
    
    account = db.query(Account).filter(Account.stripe_customer_id == customer_id).first()
    if not account:
        logger.error({"event": "invoice_failed_account_not_found", "customer_id": customer_id})
        return
    
    # Update subscription status to past_due
    account.subscription_status = "past_due"
    db.commit()
    
    logger.warning({
        "event": "invoice_payment_failed",
        "account_id": str(account.id),
        "invoice_id": invoice_data.get("id")
    })
    
    # TODO: Send payment failed email via Mailhog


async def handle_subscription_updated(db: Session, subscription_data: dict):
    """Handle subscription updates."""
    subscription_id = subscription_data.get("id")
    customer_id = subscription_data.get("customer")
    status = subscription_data.get("status")
    
    account = db.query(Account).filter(Account.stripe_customer_id == customer_id).first()
    if not account:
        logger.error({"event": "subscription_update_account_not_found", "customer_id": customer_id})
        return
    
    # Update subscription details
    account.stripe_subscription_id = subscription_id
    account.subscription_status = status
    account.subscription_current_period_end = datetime.fromtimestamp(subscription_data.get("current_period_end"))
    
    # Update plan based on subscription items
    items = subscription_data.get("items", {}).get("data", [])
    if items:
        # For simplicity, map based on amount
        price = items[0].get("price", {})
        amount = price.get("unit_amount", 0)
        
        if amount == 0:
            account.plan = "free"
        elif amount == 990:
            account.plan = "pro"
        elif amount == 2990:
            account.plan = "team"
    
    db.commit()
    
    logger.info({
        "event": "subscription_updated",
        "account_id": str(account.id),
        "status": status,
        "plan": account.plan
    })


async def handle_subscription_deleted(db: Session, subscription_data: dict):
    """Handle subscription cancellation."""
    subscription_id = subscription_data.get("id")
    customer_id = subscription_data.get("customer")
    
    account = db.query(Account).filter(Account.stripe_customer_id == customer_id).first()
    if not account:
        logger.error({"event": "subscription_delete_account_not_found", "customer_id": customer_id})
        return
    
    # Revert to free plan
    account.plan = "free"
    account.subscription_status = "canceled"
    account.stripe_subscription_id = None
    account.subscription_current_period_end = None
    
    db.commit()
    
    logger.info({
        "event": "subscription_deleted",
        "account_id": str(account.id)
    })
    
    # TODO: Send cancellation confirmation email via Mailhog
