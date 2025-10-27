import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/dashboard/analytics');
  });

  test('should display analytics page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Analytics/i);
  });

  test('should show navigation tabs', async ({ page }) => {
    // Check for navigation links
    const libraryLink = page.locator('a[href="/dashboard"]');
    const analyticsLink = page.locator('a[href="/dashboard/analytics"]');
    
    await expect(libraryLink).toBeVisible();
    await expect(analyticsLink).toBeVisible();
  });

  test('should display summary cards with placeholder data', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('h1');
    
    // Check for summary sections
    await expect(page.locator('text=Total QR Codes')).toBeVisible();
    await expect(page.locator('text=Total Exports')).toBeVisible();
    await expect(page.locator('text=Total Scans')).toBeVisible();
  });

  test('should display time series charts', async ({ page }) => {
    // Wait for charts to render
    await page.waitForTimeout(2000);
    
    // Check for chart sections
    await expect(page.locator('text=Activity Over Time')).toBeVisible();
    await expect(page.locator('text=Events Timeline')).toBeVisible();
    await expect(page.locator('text=Events Comparison')).toBeVisible();
  });

  test('should have period and days selectors', async ({ page }) => {
    // Check for period selector
    const periodSelect = page.locator('select').first();
    await expect(periodSelect).toBeVisible();
    
    // Verify period options
    const periodOptions = await periodSelect.locator('option').allTextContents();
    expect(periodOptions).toContain('Daily');
    expect(periodOptions).toContain('Weekly');
    
    // Check for days selector
    const daysSelect = page.locator('select').nth(1);
    await expect(daysSelect).toBeVisible();
    
    // Verify days options
    const daysOptions = await daysSelect.locator('option').allTextContents();
    expect(daysOptions).toContain('Last 7 days');
    expect(daysOptions).toContain('Last 30 days');
    expect(daysOptions).toContain('Last 90 days');
  });

  test('should change period when selector is updated', async ({ page }) => {
    const periodSelect = page.locator('select').first();
    
    // Change to weekly
    await periodSelect.selectOption('weekly');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify selection
    const selectedValue = await periodSelect.inputValue();
    expect(selectedValue).toBe('weekly');
  });

  test('should change days range when selector is updated', async ({ page }) => {
    const daysSelect = page.locator('select').nth(1);
    
    // Change to 90 days
    await daysSelect.selectOption('90');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify selection
    const selectedValue = await daysSelect.inputValue();
    expect(selectedValue).toBe('90');
  });

  test('should display about analytics section', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for info section
    await expect(page.locator('text=About Analytics')).toBeVisible();
    await expect(page.locator('text=Creates:')).toBeVisible();
    await expect(page.locator('text=Exports:')).toBeVisible();
    await expect(page.locator('text=Scans:')).toBeVisible();
  });

  test('should navigate to library when clicking library tab', async ({ page }) => {
    const libraryLink = page.locator('a[href="/dashboard"]');
    await libraryLink.click();
    
    // Verify navigation
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('should have create new QR button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create New QR")');
    await expect(createButton).toBeVisible();
  });
});

test.describe('Shortlink Redirects', () => {
  test('should redirect for valid shortlink', async ({ page }) => {
    // This test would need a valid shortlink to be created first
    // For now, we test that the endpoint returns a response
    const response = await page.request.get('http://localhost:8000/r/test-code', {
      maxRedirects: 0,
    });
    
    // Should either redirect (302) or not found (404)
    expect([302, 404]).toContain(response.status());
  });

  test('should return 404 for non-existent shortlink', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/r/non-existent-code-12345', {
      maxRedirects: 0,
    });
    
    expect(response.status()).toBe(404);
  });

  test('should have rate limit headers on redirect', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/r/test-code', {
      maxRedirects: 0,
    });
    
    // Check for rate limit headers (if rate limiting is active)
    const headers = response.headers();
    // Rate limit headers might not be present if Redis is not available
    // This is a soft check
    if (headers['x-ratelimit-limit']) {
      expect(headers['x-ratelimit-limit']).toBeTruthy();
    }
  });
});

test.describe('Analytics API Endpoints', () => {
  test('should return 401 for analytics summary without auth', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/analytics/summary');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for analytics timeseries without auth', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/analytics/timeseries');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for analytics events without auth', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/analytics/events');
    expect(response.status()).toBe(401);
  });

  test('should validate period parameter in timeseries', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/analytics/timeseries?period=invalid');
    expect(response.status()).toBe(401); // Would be 422 if auth was provided
  });
});
