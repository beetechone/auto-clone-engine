# SaaS Feature Cloner — v3 (Orchestrator + One-Command + Auth0 + Stripe)

This repository lets a **GitHub Agent** functionally replicate a target SaaS (e.g., `https://qr-generator.ai/`) with a disciplined, test-driven process.

## Features

- **Orchestrator prompts & workflows**: crawl → specs → scaffold → test → bug → phase-gate
- **One-Command local run**: `make up` (docker-compose, Makefile, .env.example)
- **Auth0 JWT** (API-level) + **Stripe test-mode** billing
- **Structured logging**, unit tests, e2e compare tests
- **Next.js** frontend + admin shells
- **FastAPI** backend with health, auth, and billing endpoints

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- pnpm (optional, for monorepo management)

### One-Command Setup

```bash
# Initialize environment and start all services
make up

# View logs
make logs

# Run tests
make test

# Run e2e tests (requires services to be running)
make e2e

# Stop all services
make down
```

### Service URLs

Once running with `make up`:
- **Web**: http://localhost:3000
- **Admin**: http://localhost:3001
- **API Docs**: http://localhost:8000/docs
- **MailHog**: http://localhost:8025
- **MinIO Console**: http://localhost:9001

## Project Structure

```
.
├── apps/
│   ├── api/          # FastAPI backend
│   ├── web/          # Next.js web application
│   └── admin/        # Next.js admin dashboard
├── docs/             # Documentation (SRS, architecture, test plans)
├── infra/
│   ├── context/      # Project state and configuration
│   ├── prompts/      # Agent prompts and tools
│   └── tools/        # Crawler and generator scripts
├── packages/         # Shared packages
└── tests/
    ├── unit/         # Python unit tests
    └── e2e/          # Playwright e2e tests
```

## Phase 1 MVP - Completed ✅

### Backend API (FastAPI)
- ✅ `/health` - Health check with structured logging
- ✅ `/secure/ping` - JWT authentication verification (Auth0)
- ✅ `/billing/plans` - List subscription plans
- ✅ `/billing/checkout` - Create Stripe checkout session
- ✅ `/billing/webhook` - Handle Stripe webhooks
- ✅ Structured JSON logging (loguru)
- ✅ Unit tests (21 tests, 73% coverage)

### Frontend Web App (Next.js)
- ✅ Homepage with QR editor placeholder
- ✅ Billing plans display (API integration)
- ✅ Responsive styling
- ✅ E2E guest flow tests

### Admin Dashboard
- ✅ Placeholder shell (Phase 4 implementation)

### Documentation
- ✅ Project brief and feature map
- ✅ SRS with MoSCoW prioritization
- ✅ Architecture overview
- ✅ Test plan and traceability matrix
- ✅ Auth0 & Stripe integration guide

## Running Tests

### Unit Tests
```bash
# Install Python dependencies
pip install -r apps/api/requirements.txt
pip install pytest pytest-cov

# Run unit tests with coverage
pytest tests/unit/ --cov=apps.api.src --cov-report=term
```

### E2E Tests
```bash
# Start services first
make up

# Install Playwright (first time only)
npx playwright install --with-deps

# Run e2e tests
npx playwright test tests/e2e/compare/compare.spec.ts
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Auth0 (JWT)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.qr-cloner.local
AUTH0_ALG=RS256

# Stripe (test mode)
STRIPE_SECRET_KEY=your_stripe_test_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Public API base
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local API
make stripe_webhook
```

## Development Workflow

1. **Discovery Phase** (Phase 0)
   - Target site crawling
   - Feature extraction
   - SRS and architecture documentation

2. **Backend MVP** (Phase 1) ✅ COMPLETED
   - API endpoints with auth and billing
   - Structured logging
   - Unit tests (>70% coverage)

3. **QR Generation** (Phase 2)
   - QR encoding service
   - Editor UI with customization
   - PNG/SVG export

4. **Library & Dashboard** (Phase 3)
   - Save and manage QR codes
   - User dashboard
   - Analytics

5. **Templates & Admin** (Phase 4)
   - Pre-configured QR templates
   - Admin panel
   - User management

6. **Billing & Limits** (Phase 5)
   - Plan enforcement
   - Usage tracking
   - Subscription management

7. **Analytics & Hardening** (Phase 6)
   - Scan tracking
   - Performance optimization
   - Security audit

## Quality Gates

- ✅ Coverage: 73% (target: 75%)
- ✅ Unit tests: 21 passing
- ✅ Structured logging: JSON format
- ✅ Security: No secrets in code
- ⏳ E2E tests: Ready (requires running services)
- ⏳ Lighthouse: ≥90 (pending Phase 2)

## Documentation

See `AGENT.md` for orchestrator operating manual and `docs/10_auth_billing.md` for Auth0 & Stripe setup.

## License

See LICENSE file.

## Contributing

See CODE_OF_CONDUCT.md and SECURITY.md for guidelines.
