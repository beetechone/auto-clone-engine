# Test Plan

## Test Strategy
Test-driven development with focus on functionality replication, security, and performance.

## Unit Tests (Backend)
### API Endpoints
- **test_health**: Health check endpoint returns OK
- **test_secure_ping_without_auth**: Auth endpoint rejects unauthenticated requests
- **test_billing_plans**: Plans endpoint returns complete plan list
- **test_billing_plans_structure**: Plans have correct data structure
- **test_billing_checkout_invalid_plan**: Checkout rejects invalid plan IDs
- **test_billing_checkout_free_plan**: Free plan checkout flow
- **test_stripe_webhook_without_signature**: Webhook validates signatures

### Coverage Target
- Minimum: 75%
- Goal: 85%+

## Integration Tests
- Auth0 JWT validation with real JWKS endpoint
- Stripe checkout session creation (test mode)
- Webhook signature verification

## E2E Tests (Playwright)
### Guest Flow
- **Load homepage**: Verify page loads and displays correctly
- **Editor placeholder**: Check editor section is visible
- **Billing plans**: Fetch and display plans from API
- **Target comparison**: Compare structure with target site

### Negative Tests
- API timeout handling
- Invalid input validation
- Auth failures (401 responses)
- Network errors

## Performance Tests
- Lighthouse CI: ≥ 90 score
- API response time: < 500ms (P95)
- Page load TTI: < 2s (P95)

## Security Tests
- No secrets in code
- Auth enforcement on protected endpoints
- Input validation
- OWASP ASVS L2 compliance

## Test Execution
```bash
# Unit tests
pytest -q

# E2E tests (requires services running)
npx playwright test tests/e2e/compare/compare.spec.ts

# Full CI
make test && make e2e
```

## Regression Strategy
- All tests run on PR
- Tag failing tests with regression labels
- Update test plan after each bug fix
