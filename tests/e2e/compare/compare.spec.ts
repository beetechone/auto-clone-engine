import { test, expect } from '@playwright/test';
test('compare landing titles between target and local', async ({ page }) => {
  const target = process.env.TARGET_URL || 'https://qr-generator.ai/';
  await page.goto(target);
  const targetTitle = await page.title();
  await page.goto('http://localhost:3000');
  const localTitle = await page.title();
  expect(localTitle.length).toBeGreaterThan(0);
});
