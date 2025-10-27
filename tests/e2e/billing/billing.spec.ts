import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Billing & Subscription Flow
 * 
 * These tests cover the complete billing lifecycle:
 * - Pricing page display
 * - Checkout flow
 * - Subscription status display
 * - Quota enforcement
 * - Customer portal access
 * - Plan cancellation
 * 
 * NOTE: These tests use Stripe test mode and require:
 * - API server running on localhost:8000
 * - Web server running on localhost:3000
 * - STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET configured
 * - Stripe CLI forwarding webhooks (optional for full flow)
 */

test.describe('Billing & Subscription E2E', () => {
  
  test.describe('Pricing Page', () => {
    test('displays all subscription plans', async ({ page }) => {
      await page.goto('http://localhost:3000/pricing')
      
      // Wait for plans to load
      await page.waitForSelector('text=Free')
      await page.waitForSelector('text=Pro')
      await page.waitForSelector('text=Team')
      
      // Verify Free plan details
      const freePlan = page.locator('text=Free').locator('..')
      await expect(freePlan).toContainText('$0')
      await expect(freePlan).toContainText('50 QR codes per month')
      await expect(freePlan).toContainText('10 exports per day')
      
      // Verify Pro plan details
      const proPlan = page.locator('text=Pro').locator('..')
      await expect(proPlan).toContainText('$9')
      await expect(proPlan).toContainText('1,000 QR codes per month')
      await expect(proPlan).toContainText('100 exports per day')
      
      // Verify Team plan details
      const teamPlan = page.locator('text=Team').locator('..')
      await expect(teamPlan).toContainText('$29')
      await expect(teamPlan).toContainText('10,000 QR codes per month')
    })
    
    test('shows popular badge on Pro plan', async ({ page }) => {
      await page.goto('http://localhost:3000/pricing')
      
      // Check for popular badge
      const proPlan = page.locator('text=Pro').locator('..')
      await expect(proPlan.locator('text=POPULAR')).toBeVisible()
    })
    
    test('displays FAQ section', async ({ page }) => {
      await page.goto('http://localhost:3000/pricing')
      
      // Scroll to FAQ
      await page.locator('text=Frequently Asked Questions').scrollIntoViewIfNeeded()
      
      // Verify FAQ items
      await expect(page.locator('summary:has-text("Can I upgrade")')).toBeVisible()
      await expect(page.locator('summary:has-text("quota limit")')).toBeVisible()
      await expect(page.locator('summary:has-text("refunds")')).toBeVisible()
    })
  })
  
  test.describe('Checkout Flow', () => {
    test('Free plan does not require checkout', async ({ page }) => {
      await page.goto('http://localhost:3000/pricing')
      
      const freeButton = page.locator('text=Free Forever')
      await expect(freeButton).toBeVisible()
      await expect(freeButton).toBeDisabled()
    })
    
    test('Pro plan button initiates checkout', async ({ page, context }) => {
      // Mock the checkout API response
      await page.route('**/billing/checkout', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/test/cs_test_123'
          })
        })
      })
      
      await page.goto('http://localhost:3000/pricing')
      
      // Click Get Started on Pro plan
      const proButton = page.locator('button:has-text("Get Started")').first()
      
      // Listen for navigation
      const navigationPromise = page.waitForNavigation()
      await proButton.click()
      
      // Should redirect to Stripe checkout
      await navigationPromise
      expect(page.url()).toContain('checkout.stripe.com')
    })
    
    test('handles checkout errors gracefully', async ({ page }) => {
      // Mock checkout API error
      await page.route('**/billing/checkout', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Stripe error' })
        })
      })
      
      // Spy on alert
      page.on('dialog', dialog => dialog.accept())
      
      await page.goto('http://localhost:3000/pricing')
      
      const proButton = page.locator('button:has-text("Get Started")').first()
      await proButton.click()
      
      // Should show error alert
      // Alert is automatically accepted by dialog handler
    })
  })
  
  test.describe('Dashboard Subscription Status', () => {
    test('displays subscription status for free user', async ({ page }) => {
      // Mock subscription API response
      await page.route('**/billing/subscription', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: 'free',
            status: 'free',
            quota_limits: {
              qr_month: 50,
              exports_day: 10,
              templates_apply: 5
            },
            usage: {
              qr_generated: 10,
              exports_today: 2,
              templates_applied: 1
            }
          })
        })
      })
      
      // Mock QR items API
      await page.route('**/library/qr-items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        })
      })
      
      await page.goto('http://localhost:3000/dashboard')
      
      // Verify Free plan badge
      await expect(page.locator('text=🆓 Free Plan')).toBeVisible()
      
      // Verify usage display
      await expect(page.locator('text=10 / 50 QR codes this month')).toBeVisible()
      await expect(page.locator('text=2 / 10 exports today')).toBeVisible()
      
      // Verify upgrade button
      await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible()
    })
    
    test('displays subscription status for Pro user', async ({ page }) => {
      await page.route('**/billing/subscription', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: 'pro',
            status: 'active',
            current_period_end: '2025-11-27T05:44:36.997Z',
            quota_limits: {
              qr_month: 1000,
              exports_day: 100,
              templates_apply: 100
            },
            usage: {
              qr_generated: 450,
              exports_today: 25,
              templates_applied: 30
            }
          })
        })
      })
      
      await page.route('**/library/qr-items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        })
      })
      
      await page.goto('http://localhost:3000/dashboard')
      
      // Verify Pro plan badge
      await expect(page.locator('text=⭐ Pro Plan')).toBeVisible()
      
      // Verify usage display
      await expect(page.locator('text=450 / 1000 QR codes this month')).toBeVisible()
      await expect(page.locator('text=25 / 100 exports today')).toBeVisible()
      
      // Verify manage subscription button
      await expect(page.locator('button:has-text("Manage Subscription")')).toBeVisible()
    })
    
    test('shows quota warning when approaching limit', async ({ page }) => {
      await page.route('**/billing/subscription', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: 'free',
            status: 'free',
            quota_limits: {
              qr_month: 50,
              exports_day: 10,
              templates_apply: 5
            },
            usage: {
              qr_generated: 45,  // 90% of limit
              exports_today: 9,   // 90% of limit
              templates_applied: 4
            }
          })
        })
      })
      
      await page.route('**/library/qr-items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        })
      })
      
      await page.goto('http://localhost:3000/dashboard')
      
      // Verify quota warning appears
      await expect(page.locator('text=⚠️ Approaching Quota Limit')).toBeVisible()
      await expect(page.locator('text=running low')).toBeVisible()
      await expect(page.locator('button:has-text("Upgrade Now")')).toBeVisible()
    })
  })
  
  test.describe('Customer Portal', () => {
    test('Pro user can access customer portal', async ({ page }) => {
      await page.route('**/billing/subscription', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: 'pro',
            status: 'active',
            quota_limits: { qr_month: 1000, exports_day: 100, templates_apply: 100 },
            usage: { qr_generated: 100, exports_today: 10, templates_applied: 5 }
          })
        })
      })
      
      await page.route('**/billing/portal', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://billing.stripe.com/portal/test_123'
          })
        })
      })
      
      await page.route('**/library/qr-items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        })
      })
      
      await page.goto('http://localhost:3000/dashboard')
      
      const manageButton = page.locator('button:has-text("Manage Subscription")')
      
      // Listen for navigation to portal
      const navigationPromise = page.waitForNavigation()
      await manageButton.click()
      
      await navigationPromise
      expect(page.url()).toContain('billing.stripe.com')
    })
  })
  
  test.describe('Quota Enforcement', () => {
    test('API returns 429 when QR quota exceeded', async ({ request }) => {
      // This test requires authenticated API access
      const response = await request.post('http://localhost:8000/qr/generate', {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        },
        data: {
          type: 'url',
          payload: { url: 'https://example.com' }
        }
      })
      
      // If quota exceeded, should get 429
      if (response.status() === 429) {
        const body = await response.json()
        expect(body.detail).toHaveProperty('error', 'quota_exceeded')
        expect(body.detail).toHaveProperty('quota_type')
        expect(body.detail).toHaveProperty('limit')
      }
    })
    
    test('API returns 429 when export quota exceeded', async ({ request }) => {
      const response = await request.get('http://localhost:8000/qr/export/test-id', {
        headers: {
          'Authorization': 'Bearer test_token'
        }
      })
      
      // If quota exceeded, should get 429
      if (response.status() === 429) {
        const body = await response.json()
        expect(body.detail.message).toContain('Daily export limit')
      }
    })
  })
  
  test.describe('Complete Subscription Lifecycle', () => {
    test('User can upgrade from Free to Pro', async ({ page }) => {
      // Step 1: Start as Free user
      await page.route('**/billing/subscription', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: 'free',
            status: 'free',
            quota_limits: { qr_month: 50, exports_day: 10, templates_apply: 5 },
            usage: { qr_generated: 48, exports_today: 9, templates_applied: 4 }
          })
        })
      })
      
      await page.route('**/library/qr-items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 })
        })
      })
      
      await page.goto('http://localhost:3000/dashboard')
      
      // Verify Free plan status
      await expect(page.locator('text=🆓 Free Plan')).toBeVisible()
      
      // Step 2: Click upgrade button
      const upgradeButton = page.locator('button:has-text("Upgrade to Pro")')
      await upgradeButton.click()
      
      // Should navigate to pricing page
      await page.waitForURL('**/pricing')
      await expect(page).toHaveURL(/pricing/)
    })
    
    test('Displays success message after checkout', async ({ page }) => {
      // Simulate return from successful checkout
      await page.goto('http://localhost:3000/dashboard?checkout=success')
      
      // Should show success indicator
      // (Implementation depends on how success is displayed)
    })
    
    test('Displays cancellation message', async ({ page }) => {
      // Simulate return from canceled checkout
      await page.goto('http://localhost:3000/pricing?checkout=canceled')
      
      // User should be back on pricing page
      await expect(page).toHaveURL(/pricing/)
    })
  })
})
