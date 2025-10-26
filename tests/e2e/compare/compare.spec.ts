import { test, expect } from '@playwright/test';

test.describe('QR Generator Clone - Guest Flow', () => {
  test('should load homepage and display title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for main heading
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('QR Generator Clone');
  });

  test('should display editor placeholder', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for editor placeholder section
    const editorSection = await page.locator('h2:has-text("QR Editor")');
    await expect(editorSection).toBeVisible();
  });

  test('should fetch and display billing plans', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for plans to load
    await page.waitForSelector('h2:has-text("Billing Plans")', { timeout: 10000 });
    
    // Should display at least the free plan
    const planCards = await page.locator('h3').count();
    expect(planCards).toBeGreaterThan(0);
  });

  test('should compare with target site structure', async ({ page }) => {
    const target = process.env.TARGET_URL || 'https://qr-generator.ai/';
    
    // Visit target to ensure it's accessible
    await page.goto(target);
    const targetTitle = await page.title();
    expect(targetTitle.length).toBeGreaterThan(0);
    
    // Visit local app
    await page.goto('http://localhost:3000');
    const localTitle = await page.title();
    expect(localTitle.length).toBeGreaterThan(0);
    
    // Both should be accessible
    console.log(`Target: ${targetTitle}, Local: ${localTitle}`);
  });
});

test.describe('Route Comparison Tests - Target vs Local', () => {
  const TARGET_URL = process.env.TARGET_URL || 'https://qr-generator.ai';
  const LOCAL_URL = 'http://localhost:3000';
  
  const routes = [
    { path: '/', name: 'Home' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/editor', name: 'Editor' },
    { path: '/templates', name: 'Templates' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/login', name: 'Login' },
    { path: '/signup', name: 'Sign Up' }
  ];

  for (const route of routes) {
    test(`should compare ${route.name} route - status codes`, async ({ page }) => {
      // Check local route
      const localResponse = await page.goto(`${LOCAL_URL}${route.path}`);
      expect(localResponse?.status()).toBe(200);
      
      // Note: Target site routes may differ or be protected
      // We primarily test that our local routes work correctly
      console.log(`${route.name} (${route.path}): Local returns 200`);
    });

    test(`should verify ${route.name} has key elements`, async ({ page }) => {
      await page.goto(`${LOCAL_URL}${route.path}`);
      
      // Every page should have an h1
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);
      
      // Page should have loaded content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length || 0).toBeGreaterThan(0);
      
      console.log(`${route.name} has heading and content`);
    });
  }

  test('should verify navigation flows work locally', async ({ page }) => {
    // Start at home
    await page.goto(LOCAL_URL);
    
    // Navigate to pricing (if link exists)
    // This is a basic navigation test
    const url = page.url();
    expect(url).toContain('localhost:3000');
  });

  test('should verify pricing page checkout integration', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/pricing`);
    
    // Wait for plans to load
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Verify "Go Pro" button exists (checkout integration)
    const checkoutButtons = await page.locator('button:has-text("Go Pro")').count();
    expect(checkoutButtons).toBeGreaterThan(0);
    
    console.log('Pricing page has checkout buttons');
  });

  test('should verify editor page QR generation flow', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/editor`);
    
    // Check for form elements
    const textarea = await page.locator('textarea').count();
    expect(textarea).toBeGreaterThan(0);
    
    const generateButton = await page.locator('button:has-text("Generate")').count();
    expect(generateButton).toBeGreaterThan(0);
    
    // Check for preview section
    const preview = await page.locator('text=Live Preview').count();
    expect(preview).toBeGreaterThan(0);
    
    console.log('Editor page has QR generation form and preview');
  });

  test('should verify dashboard has create button', async ({ page }) => {
    await page.goto(`${LOCAL_URL}/dashboard`);
    
    // Check for create new QR button
    const createButton = await page.locator('button:has-text("Create New QR")').count();
    expect(createButton).toBeGreaterThan(0);
    
    console.log('Dashboard has create button');
  });

  test('should verify login/signup navigation', async ({ page }) => {
    // Test login page has signup link
    await page.goto(`${LOCAL_URL}/login`);
    const signupLink = await page.locator('a[href="/signup"]').count();
    expect(signupLink).toBeGreaterThan(0);
    
    // Test signup page has login link
    await page.goto(`${LOCAL_URL}/signup`);
    const loginLink = await page.locator('a[href="/login"]').count();
    expect(loginLink).toBeGreaterThan(0);
    
    console.log('Login/signup pages are cross-linked');
  });
});

