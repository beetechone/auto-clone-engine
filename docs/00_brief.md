# Project Brief — QR Generator Clone

## Goal
Functionally replicate https://qr-generator.ai/ with original branding and content. No third-party code/assets copying.

## Scope
- Target: https://qr-generator.ai/
- Backend: FastAPI with Auth0 JWT + Stripe billing
- Frontend: Next.js web app + admin dashboard
- Package manager: pnpm
- Local dev: `make up` (docker-compose)

## Current Status
- Phase: 1 (Backend MVP)
- API: Health, Auth (JWT), Billing (Plans/Checkout/Webhook)
- Web: Shell with editor placeholder + billing plans display
- Tests: Unit tests for API, e2e guest flow tests

## Quality Gates
- Coverage ≥ 75%
- Lighthouse ≥ 90
- E2E tests passing
- Structured JSON logging
- No secrets in code

