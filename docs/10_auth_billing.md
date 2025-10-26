# Auth0 & Stripe (Test Mode)

## Auth0
- Set AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_ALG (RS256) in `.env.local`
- Use `/secure/ping` to verify JWT validation
- Frontend can call API with bearer token (FE integration TBD)

## Stripe
- Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (use Stripe CLI for webhook in dev)
- `/billing/plans`, `/billing/checkout`, `/billing/webhook` provided
