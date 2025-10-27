# Billing & Subscription Integration Guide

## Overview

This guide covers the complete billing and subscription system implementation using Stripe in test mode. The system includes quota enforcement, webhook handling, and comprehensive usage tracking.

## Architecture

### Components

1. **Backend API (FastAPI)**
   - Billing endpoints for checkout and subscription management
   - Webhook handlers for Stripe events
   - Quota enforcement middleware
   - Usage tracking and reporting

2. **Database Models**
   - `Account` - Extended with Stripe customer/subscription IDs
   - `UsageQuota` - Monthly and daily usage tracking
   - `BillingEvent` - Audit log for webhook events

3. **Frontend (Next.js)**
   - Pricing page with plan comparison
   - Subscription status in dashboard
   - Quota warnings and upgrade prompts

## Setup

### Environment Variables

Required environment variables in `.env.local`:

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.qr-cloner.local
AUTH0_ALG=RS256

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qrdb
```

### Stripe Setup

1. **Create Stripe Account** (Test Mode)
   - Go to https://dashboard.stripe.com/test
   - Get your test API keys from Developers > API keys

2. **Configure Webhook Endpoint**
   - In Stripe Dashboard, go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/billing/webhook`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

3. **Local Development with Stripe CLI**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login to Stripe
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:8000/billing/webhook
   
   # Or use the Makefile target
   make stripe_webhook
   ```

## Subscription Plans

### Plan Configuration

Three tiers defined in `apps/api/src/billing.py`:

| Plan | Price | QR/Month | Exports/Day | Templates |
|------|-------|----------|-------------|-----------|
| Free | $0 | 50 | 10 | 5 |
| Pro | $9.90/mo | 1,000 | 100 | 100 |
| Team | $29.90/mo | 10,000 | 1,000 | 1,000 |

### Quota Enforcement

Quotas are enforced via middleware in `apps/api/src/quota.py`:

- **Monthly QR Generation**: Resets on 1st of each month
- **Daily Exports**: Resets at midnight UTC
- **Template Applications**: Monthly limit

## API Endpoints

### Public Endpoints

#### GET /billing/plans
List all available subscription plans with quotas and features.

**Response:**
```json
{
  "plans": [
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
      "features": [
        "1,000 QR codes per month",
        "100 exports per day",
        "All templates",
        "Priority support"
      ]
    }
  ]
}
```

### Protected Endpoints (Require JWT)

#### POST /billing/checkout
Create a Stripe checkout session.

**Request:**
```json
{
  "plan_id": "pro",
  "success_url": "https://app.example.com/success",
  "cancel_url": "https://app.example.com/pricing"
}
```

**Response:**
```json
{
  "id": "cs_test_123abc",
  "url": "https://checkout.stripe.com/pay/cs_test_123abc"
}
```

#### GET /billing/subscription
Get current subscription status and usage.

**Response:**
```json
{
  "plan": "pro",
  "status": "active",
  "current_period_end": "2025-11-27T05:44:36.997Z",
  "quota_limits": {
    "qr_month": 1000,
    "exports_day": 100,
    "templates_apply": 100
  },
  "usage": {
    "qr_generated": 45,
    "exports_today": 12,
    "templates_applied": 8
  }
}
```

#### POST /billing/portal
Create customer portal session for subscription management.

**Request:**
```json
{
  "return_url": "https://app.example.com/dashboard"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/test_123"
}
```

#### GET /billing/usage
Get detailed usage statistics with percentages.

**Response:**
```json
{
  "period_start": "2025-10-01T00:00:00Z",
  "period_end": "2025-10-31T23:59:59Z",
  "usage": {
    "qr_generated": {
      "count": 45,
      "limit": 1000,
      "percentage": 4.5
    },
    "exports_today": {
      "count": 12,
      "limit": 100,
      "percentage": 12.0
    }
  }
}
```

### Webhook Endpoint

#### POST /billing/webhook
Handle Stripe webhook events.

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Supported Events:**
- `checkout.session.completed` - Activates subscription
- `invoice.payment_succeeded` - Confirms payment
- `invoice.payment_failed` - Marks as past_due
- `customer.subscription.updated` - Updates subscription details
- `customer.subscription.deleted` - Cancels subscription

## Quota Enforcement

### Using Quota Middleware

Apply quota enforcement to protected endpoints:

```python
from fastapi import Depends
from apps.api.src.quota import enforce_qr_quota, increment_qr_quota
from apps.api.src.auth import get_current_user
from apps.api.src.database import get_db

@router.post("/qr/generate")
async def generate_qr(
    user: dict = Depends(get_current_user),
    account: Account = Depends(enforce_qr_quota),
    db: Session = Depends(get_db)
):
    # Generate QR code
    qr_code = create_qr_code(...)
    
    # Increment quota counter
    increment_qr_quota(account, db)
    
    return qr_code
```

### Quota Functions

**Check Functions:**
- `check_qr_quota(account, db)` - Check if can generate QR
- `check_export_quota(account, db)` - Check if can export
- `check_template_quota(account, db)` - Check if can apply template

**Increment Functions:**
- `increment_qr_quota(account, db)` - Increment QR counter
- `increment_export_quota(account, db)` - Increment export counter
- `increment_template_quota(account, db)` - Increment template counter

**Enforcement Dependencies:**
- `enforce_qr_quota(user, db)` - Raises 429 if quota exceeded
- `enforce_export_quota(user, db)` - Raises 429 if quota exceeded
- `enforce_template_quota(user, db)` - Raises 429 if quota exceeded

### Error Responses

When quota is exceeded, API returns 429 with details:

```json
{
  "detail": {
    "error": "quota_exceeded",
    "message": "Monthly QR generation limit reached (50). Please upgrade your plan.",
    "quota_type": "qr_month",
    "limit": 50,
    "upgrade_url": "/pricing"
  }
}
```

## Frontend Integration

### Pricing Page

The pricing page (`apps/web/pages/pricing.js`) displays plans and handles checkout:

```javascript
const handleCheckout = async (planId) => {
  const response = await fetch(`${apiBase}/billing/checkout`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      plan_id: planId,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`
    })
  })
  const data = await response.json()
  if (data.url) window.location.href = data.url
}
```

### Dashboard Subscription Status

The dashboard (`apps/web/pages/dashboard.js`) shows current plan and usage:

```javascript
// Fetch subscription status
const response = await fetch(`${apiBase}/billing/subscription`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
const data = await response.json()

// Display plan status
{data.plan === 'free' && (
  <button onClick={() => window.location.href = '/pricing'}>
    Upgrade to Pro
  </button>
)}

// Show usage statistics
<div>
  {data.usage.qr_generated} / {data.quota_limits.qr_month} QR codes
</div>
```

### Customer Portal Integration

Allow users to manage their subscription:

```javascript
const openPortal = async () => {
  const response = await fetch(`${apiBase}/billing/portal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      return_url: window.location.href 
    })
  })
  const data = await response.json()
  if (data.url) window.location.href = data.url
}
```

## Testing

### Unit Tests

Run unit tests for billing and quota:

```bash
# Test webhook handlers
pytest tests/unit/test_billing_webhooks.py -v

# Test quota enforcement
pytest tests/unit/test_quota.py -v

# All billing tests
pytest tests/unit/test_billing*.py tests/unit/test_quota.py -v
```

### Testing with Stripe CLI

1. **Trigger Test Events**
   ```bash
   # Trigger successful checkout
   stripe trigger checkout.session.completed
   
   # Trigger payment failure
   stripe trigger invoice.payment_failed
   
   # Trigger subscription cancellation
   stripe trigger customer.subscription.deleted
   ```

2. **Test Webhooks Locally**
   ```bash
   # Forward webhooks to local server
   stripe listen --forward-to localhost:8000/billing/webhook
   
   # In another terminal, trigger events
   stripe trigger checkout.session.completed
   ```

3. **View Webhook Logs**
   ```bash
   # Check application logs
   docker compose logs -f api
   
   # Should see structured logs:
   # {"event":"stripe_webhook_received","event_type":"checkout.session.completed"}
   # {"event":"checkout_completed","account_id":"...","plan":"pro"}
   ```

### E2E Testing Flow

1. **Free User Flow**
   - User creates account (free plan)
   - Generate QR codes (count towards quota)
   - Hit quota limit (50 QR codes)
   - Receive 429 error with upgrade prompt

2. **Upgrade Flow**
   - Click "Upgrade to Pro"
   - Complete Stripe checkout (test mode)
   - Webhook activates subscription
   - New quota limits applied (1,000 QR codes)

3. **Cancellation Flow**
   - Open customer portal
   - Cancel subscription
   - Webhook processes cancellation
   - Account reverts to free plan
   - Quota limits reduced to free tier

## Monitoring & Alerts

### Structured Logging

All billing events are logged with structured JSON:

```python
logger.info({
    "event": "checkout_completed",
    "account_id": str(account.id),
    "plan": "pro",
    "subscription_id": subscription_id
})

logger.warning({
    "event": "quota_exceeded",
    "account_id": str(account.id),
    "quota_type": "qr_month",
    "limit": 50,
    "current": 50
})
```

### Key Metrics to Monitor

- **Subscription Events**: Activations, cancellations, failures
- **Quota Exceeded**: Track users hitting limits
- **Webhook Failures**: Failed webhook processing
- **Payment Failures**: Invoice payment failures

### Alert Conditions

Set up alerts for:
- `quota_exceeded` events (upgrade opportunities)
- `invoice_payment_failed` (at-risk subscriptions)
- Webhook processing errors
- High subscription cancellation rate

## Database Schema

### Account Table Extensions

```sql
ALTER TABLE accounts ADD COLUMN stripe_customer_id VARCHAR UNIQUE;
ALTER TABLE accounts ADD COLUMN stripe_subscription_id VARCHAR UNIQUE;
ALTER TABLE accounts ADD COLUMN subscription_status VARCHAR DEFAULT 'free';
ALTER TABLE accounts ADD COLUMN subscription_current_period_end TIMESTAMP;

ALTER TABLE accounts ADD CONSTRAINT account_subscription_status_check 
  CHECK (subscription_status IN ('free', 'trial', 'active', 'past_due', 'canceled', 'paused'));

CREATE INDEX idx_accounts_stripe_customer ON accounts(stripe_customer_id);
CREATE INDEX idx_accounts_stripe_subscription ON accounts(stripe_subscription_id);
```

### UsageQuota Table

```sql
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  qr_generated_count INTEGER DEFAULT 0,
  exports_count INTEGER DEFAULT 0,
  templates_applied_count INTEGER DEFAULT 0,
  daily_exports INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_quotas_account ON usage_quotas(account_id);
CREATE INDEX idx_usage_quotas_period ON usage_quotas(account_id, period_start, period_end);
```

### BillingEvent Table

```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  stripe_event_id VARCHAR UNIQUE NOT NULL,
  event_type VARCHAR NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_events_account ON billing_events(account_id);
CREATE INDEX idx_billing_events_stripe_id ON billing_events(stripe_event_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type, created_at);
```

## Security Considerations

1. **Webhook Signature Verification**
   - Always verify Stripe webhook signatures
   - Use `STRIPE_WEBHOOK_SECRET` for validation
   - Reject requests with invalid signatures

2. **Rate Limiting**
   - Consider adding rate limiting on checkout endpoint
   - Prevent abuse of free tier

3. **Idempotency**
   - Webhook events are deduplicated by `stripe_event_id`
   - Safe to process same event multiple times

4. **Customer Portal Access**
   - Only authenticated users with active subscriptions
   - Portal sessions are time-limited by Stripe

## Troubleshooting

### Common Issues

**Webhook Not Receiving Events**
- Check `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify webhook endpoint is publicly accessible
- Use Stripe CLI for local development
- Check Stripe Dashboard > Developers > Webhooks > Logs

**Quota Not Updating**
- Verify webhook events are being processed
- Check database for `usage_quotas` records
- Review application logs for errors

**Checkout Session Not Creating**
- Verify `STRIPE_SECRET_KEY` is set
- Check user is authenticated
- Ensure valid plan ID is provided
- Review Stripe Dashboard > Logs

**Customer Portal Not Working**
- User must have an active Stripe customer ID
- Check `stripe_customer_id` in accounts table
- Verify user has an active subscription

## Production Deployment

### Checklist

- [ ] Switch to Stripe production API keys
- [ ] Update webhook endpoint to production URL
- [ ] Configure webhook signing secret for production
- [ ] Set up monitoring and alerts
- [ ] Test complete subscription flow
- [ ] Verify quota enforcement works
- [ ] Test cancellation and refund flows
- [ ] Review security settings
- [ ] Enable Stripe email receipts
- [ ] Configure tax collection (if needed)

### Environment Variables

```bash
# Production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production API base
NEXT_PUBLIC_API_BASE=https://api.qr-cloner.com
```

## Support & Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Customer Portal**: https://stripe.com/docs/billing/subscriptions/customer-portal

## Changelog

### Version 2.0.0 (Phase 5)
- ✅ Complete webhook handling for all events
- ✅ Quota enforcement middleware
- ✅ Customer portal integration
- ✅ Usage tracking and reporting
- ✅ Enhanced pricing page
- ✅ Subscription status in dashboard
- ✅ Comprehensive unit tests
- ✅ Structured logging for all events
