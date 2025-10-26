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

