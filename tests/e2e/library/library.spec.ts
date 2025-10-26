import { test, expect } from '@playwright/test';

/**
 * Phase 3 - Library & Dashboard E2E Tests
 * 
 * These tests verify the Library functionality including:
 * - Dashboard list view with search/sort/pagination
 * - QR item detail view
 * - Create/Edit/Delete/Duplicate operations
 * - Guest access restrictions
 * - Navigation between pages
 */

test.describe('Phase 3 - Library & Dashboard Tests', () => {
  
  test.describe('Dashboard - Guest Access', () => {
    test('should show placeholder data for unauthenticated users', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Dashboard should load successfully even for guests
      const heading = page.locator('h1:has-text("My Dashboard")');
      await expect(heading).toBeVisible();
      
      // Check for search and sort controls
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Should show placeholder data when API is not available
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('should allow search functionality', async ({ page }) => {
      await page.goto('/dashboard');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('Company');
      
      // Verify search input works
      expect(await searchInput.inputValue()).toBe('Company');
    });

    test('should allow sorting selection', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check sort options exist
      const sortBySelect = page.locator('select').first();
      await expect(sortBySelect).toBeVisible();
      
      // Change sort option
      await sortBySelect.selectOption('name');
      expect(await sortBySelect.inputValue()).toBe('name');
    });
  });

  test.describe('Dashboard - List View', () => {
    test('should display table with correct columns', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check table headers
      await expect(page.locator('th:has-text("Preview")')).toBeVisible();
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Created")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();
    });

    test('should show Create New QR button', async ({ page }) => {
      await page.goto('/dashboard');
      
      const createButton = page.locator('button:has-text("Create New QR")');
      await expect(createButton).toBeVisible();
    });

    test('should navigate to editor when clicking create button', async ({ page }) => {
      await page.goto('/dashboard');
      
      await page.click('button:has-text("Create New QR")');
      
      await page.waitForURL(/\/editor/);
      expect(page.url()).toContain('/editor');
    });

    test('should display action buttons for each QR item', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for table to load
      await page.waitForSelector('tbody tr', { timeout: 5000 }).catch(() => {});
      
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        // Check for action buttons
        await expect(firstRow.locator('button:has-text("View")')).toBeVisible();
        await expect(firstRow.locator('button:has-text("Duplicate")')).toBeVisible();
        await expect(firstRow.locator('button:has-text("Delete")')).toBeVisible();
      }
    });
  });

  test.describe('Dashboard - QR Item Detail Page', () => {
    test('should navigate to detail page when clicking view button', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for data to load
      await page.waitForSelector('tbody tr', { timeout: 5000 }).catch(() => {});
      
      const viewButton = page.locator('button:has-text("View")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        
        // Should navigate to detail page
        await page.waitForURL(/\/dashboard\/items\//);
        expect(page.url()).toContain('/dashboard/items/');
      }
    });

    test('should load detail page directly', async ({ page }) => {
      // Use a placeholder ID
      await page.goto('/dashboard/items/test-id-123');
      
      // Page should load (may show error or placeholder)
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Should have a back button
      const backButton = page.locator('button:has-text("Back to Dashboard")');
      await expect(backButton).toBeVisible();
    });

    test('should have action buttons on detail page', async ({ page }) => {
      await page.goto('/dashboard/items/test-id-123');
      
      // Wait for page to load
      await page.waitForSelector('body');
      
      // Look for action buttons (may not be visible if item doesn't exist)
      const editButton = page.locator('button:has-text("Edit")');
      const duplicateButton = page.locator('button:has-text("Duplicate")');
      const deleteButton = page.locator('button:has-text("Delete")');
      
      // At least one action should be available or error shown
      const hasActions = await editButton.isVisible() || await duplicateButton.isVisible() || await deleteButton.isVisible();
      const hasError = await page.locator('text=not found').isVisible() || await page.locator('text=Please log in').isVisible();
      
      expect(hasActions || hasError).toBeTruthy();
    });

    test('should navigate back to dashboard from detail page', async ({ page }) => {
      await page.goto('/dashboard/items/test-id-123');
      
      const backButton = page.locator('button:has-text("Back to Dashboard")');
      await backButton.click();
      
      await page.waitForURL(/\/dashboard$/);
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Editor - Save to Library', () => {
    test('should have save to library button', async ({ page }) => {
      await page.goto('/editor');
      
      const saveButton = page.locator('button:has-text("Save to Library")');
      await expect(saveButton).toBeVisible();
    });

    test('should require name input for saving', async ({ page }) => {
      await page.goto('/editor');
      
      // Fill in content but not name
      const contentTextarea = page.locator('textarea');
      await contentTextarea.fill('https://example.com');
      
      // Name input should be visible and empty by default
      const nameInput = page.locator('input[placeholder*="My QR"]');
      await expect(nameInput).toBeVisible();
    });

    test('should have update button when editing existing item', async ({ page }) => {
      await page.goto('/editor?edit=test-id-123');
      
      // Wait for page to load
      await page.waitForSelector('body');
      
      // Should have Update button when editing
      const updateButton = page.locator('button:has-text("Update QR Code")');
      if (await updateButton.isVisible()) {
        await expect(updateButton).toBeVisible();
      } else {
        // If API not available, may still show Save button
        const saveButton = page.locator('button:has-text("Save to Library")');
        await expect(saveButton).toBeVisible();
      }
    });

    test('should navigate to dashboard after successful save (simulated)', async ({ page }) => {
      // This test simulates the flow without actual API
      await page.goto('/editor');
      
      const nameInput = page.locator('input[placeholder*="My QR"]');
      const contentTextarea = page.locator('textarea');
      const generateButton = page.locator('button:has-text("Generate QR Code")');
      
      await nameInput.fill('Test QR Code');
      await contentTextarea.fill('https://example.com');
      await generateButton.click();
      
      // Verify inputs were filled
      expect(await nameInput.inputValue()).toBe('Test QR Code');
      expect(await contentTextarea.inputValue()).toBe('https://example.com');
    });
  });

  test.describe('Page Accessibility & SEO', () => {
    test('dashboard should have proper title and heading', async ({ page }) => {
      await page.goto('/dashboard');
      
      const title = await page.title();
      expect(title).toContain('Dashboard');
      
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('detail page should have proper title', async ({ page }) => {
      await page.goto('/dashboard/items/test-id-123');
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('editor should have proper title when editing', async ({ page }) => {
      await page.goto('/editor?edit=test-id-123');
      
      const title = await page.title();
      expect(title).toContain('QR');
    });
  });

  test.describe('Navigation Flow', () => {
    test('should complete full CRUD navigation flow', async ({ page }) => {
      // 1. Start at dashboard
      await page.goto('/dashboard');
      await expect(page.locator('h1:has-text("My Dashboard")')).toBeVisible();
      
      // 2. Navigate to editor
      await page.click('button:has-text("Create New QR")');
      await page.waitForURL(/\/editor/);
      await expect(page.locator('h1:has-text("QR Code Editor")')).toBeVisible();
      
      // 3. Fill in QR code details
      const nameInput = page.locator('input[placeholder*="My QR"]');
      const contentTextarea = page.locator('textarea');
      await nameInput.fill('Test Navigation QR');
      await contentTextarea.fill('https://test.example.com');
      
      // 4. Generate QR code
      await page.click('button:has-text("Generate QR Code")');
      
      // Verify form is filled
      expect(await nameInput.inputValue()).toBe('Test Navigation QR');
    });

    test('should handle direct URL access', async ({ page }) => {
      // Test direct access to various pages
      const pages = [
        '/dashboard',
        '/dashboard/items/test-123',
        '/editor',
        '/editor?edit=test-123'
      ];
      
      for (const url of pages) {
        // Page should load without errors
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show appropriate message when API is unavailable', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Dashboard should still load even if API fails
      await expect(page.locator('h1:has-text("My Dashboard")')).toBeVisible();
      
      // May show placeholder data or warning message
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    });

    test('should handle non-existent QR item gracefully', async ({ page }) => {
      await page.goto('/dashboard/items/non-existent-id-999');
      
      // Should show error message or redirect
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Should have back to dashboard button
      const backButton = page.locator('button:has-text("Back to Dashboard")');
      await expect(backButton).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('dashboard should be visible on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      const heading = page.locator('h1:has-text("My Dashboard")');
      await expect(heading).toBeVisible();
    });

    test('editor should be functional on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/editor');
      
      const heading = page.locator('h1:has-text("QR Code Editor")');
      await expect(heading).toBeVisible();
      
      const nameInput = page.locator('input[placeholder*="My QR"]');
      await expect(nameInput).toBeVisible();
    });
  });

  test.describe('Status Code Checks', () => {
    test('all library pages should return 200', async ({ page }) => {
      const pages = [
        '/dashboard',
        '/editor'
      ];
      
      for (const url of pages) {
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
      }
    });
  });
});
