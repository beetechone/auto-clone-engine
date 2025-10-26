# SaaS Feature Cloner — v3 (Orchestrator + One-Command + Auth0 + Stripe)

This repository lets a **GitHub Agent** functionally replicate a target SaaS (e.g., `https://qr-generator.ai/`) with a disciplined, test-driven process.
It includes:
- Orchestrator prompts & workflows (crawl → specs → scaffold → test → bug → phase-gate)
- One-Command local run (`docker-compose.yml`, `Makefile`, `.env.example`)
- **Auth0 JWT** (API-level) + **Stripe test-mode** billing
- Structured logging, unit tests, e2e compare stub

See `AGENT.md` and `docs/10_auth_billing.md`.
