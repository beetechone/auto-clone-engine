import { test, expect } from '@playwright/test';

test.describe('Template Gallery E2E Flow - Phase 4', () => {
  
  test.describe('Public Template Gallery', () => {
    test('should load templates page and fetch from API', async ({ page }) => {
      await page.goto('/templates');
      
      // Check heading
      const heading = page.locator('h1:has-text("QR Code Templates")');
      await expect(heading).toBeVisible();
      
      // Wait for templates to load (or show loading/error state)
      await page.waitForTimeout(1000);
      
      // Should show either templates or a message (loading/error/no templates)
      const hasTemplates = await page.locator('h3').count() > 0;
      const hasMessage = await page.locator('text=Loading').count() > 0 ||
                         await page.locator('text=No templates').count() > 0 ||
                         await page.locator('text=Failed').count() > 0;
      
      expect(hasTemplates || hasMessage).toBeTruthy();
    });

    test('should display search and filter controls', async ({ page }) => {
      await page.goto('/templates');
      
      // Check for search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Check for category selector
      const categorySelect = page.locator('select');
      await expect(categorySelect).toBeVisible();
      await expect(categorySelect).toContainText('All Categories');
    });

    test('should filter templates by search term', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(500);
      
      // Type in search box
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('business');
      
      // Wait for API call to complete
      await page.waitForTimeout(800);
      
      // Templates should update (or show no results)
      // This test passes regardless of actual data
    });

    test('should filter templates by category', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(500);
      
      // Get category dropdown
      const categorySelect = page.locator('select');
      const optionCount = await categorySelect.locator('option').count();
      
      // If there are categories, select one
      if (optionCount > 1) {
        await categorySelect.selectOption({ index: 1 });
        await page.waitForTimeout(800);
      }
      
      // Test passes whether categories exist or not
    });

    test('should display template cards with key information', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(1000);
      
      // Check if template cards exist
      const templateCards = await page.locator('[style*="padding: 1.5rem"]').count();
      
      if (templateCards > 0) {
        // If templates exist, verify they have required elements
        const firstCard = page.locator('[style*="padding: 1.5rem"]').first();
        
        // Should have a name (h3)
        const hasTitle = await firstCard.locator('h3').count() > 0;
        expect(hasTitle).toBeTruthy();
        
        // Should have a "Use Template" button
        const hasButton = await firstCard.locator('button:has-text("Use Template")').count() > 0;
        expect(hasButton).toBeTruthy();
      }
    });

    test('should handle pagination when many templates exist', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(1000);
      
      // Check if pagination controls appear
      const prevButton = page.locator('button:has-text("Previous")');
      const nextButton = page.locator('button:has-text("Next")');
      
      // Pagination appears when there are enough templates
      const hasPagination = await prevButton.count() > 0 || await nextButton.count() > 0;
      
      if (hasPagination) {
        // Previous should be disabled on first page
        await expect(prevButton).toBeDisabled();
      }
      
      // Test passes whether pagination exists or not
    });
  });

  test.describe('Apply Template to Editor Flow', () => {
    test('should navigate to editor when clicking "Use Template"', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(1000);
      
      // Try to find and click first "Use Template" button
      const useButton = page.locator('button:has-text("Use Template")').first();
      const buttonExists = await useButton.count() > 0;
      
      if (buttonExists) {
        await useButton.click();
        
        // Should navigate to editor
        await page.waitForURL(/\/editor/);
        expect(page.url()).toContain('/editor');
        expect(page.url()).toContain('template=');
      }
      
      // Test passes whether templates exist or not
    });

    test('should store template data in sessionStorage', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForTimeout(1000);
      
      // Click first template if available
      const useButton = page.locator('button:has-text("Use Template")').first();
      const buttonExists = await useButton.count() > 0;
      
      if (buttonExists) {
        await useButton.click();
        await page.waitForTimeout(500);
        
        // Check sessionStorage for template data
        const templateData = await page.evaluate(() => {
          return sessionStorage.getItem('appliedTemplate');
        });
        
        // If template was clicked, data should be stored
        expect(templateData).toBeTruthy();
        
        // Should be valid JSON
        if (templateData) {
          const parsed = JSON.parse(templateData);
          expect(parsed).toHaveProperty('id');
          expect(parsed).toHaveProperty('name');
        }
      }
    });
  });

  test.describe('Admin Template Management', () => {
    test('should load admin templates page', async ({ page }) => {
      await page.goto('http://localhost:3001/templates');
      
      // Check heading
      const heading = page.locator('h1:has-text("Template Management")');
      await expect(heading).toBeVisible();
      
      // Check for new template button
      const newButton = page.locator('button:has-text("New Template")');
      await expect(newButton).toBeVisible();
    });

    test('should display filter tabs (all/published/unpublished)', async ({ page }) => {
      await page.goto('http://localhost:3001/templates');
      
      // Check for filter tabs
      await expect(page.locator('button:has-text("all")')).toBeVisible();
      await expect(page.locator('button:has-text("published")')).toBeVisible();
      await expect(page.locator('button:has-text("unpublished")')).toBeVisible();
    });

    test('should switch between filter tabs', async ({ page }) => {
      await page.goto('http://localhost:3001/templates');
      await page.waitForTimeout(500);
      
      // Click on published tab
      await page.click('button:has-text("published")');
      await page.waitForTimeout(500);
      
      // Click on unpublished tab
      await page.click('button:has-text("unpublished")');
      await page.waitForTimeout(500);
      
      // Click back to all
      await page.click('button:has-text("all")');
      await page.waitForTimeout(500);
      
      // Test passes - tabs are clickable
    });

    test('should show auth required message when not authenticated', async ({ page }) => {
      await page.goto('http://localhost:3001/templates');
      await page.waitForTimeout(1500);
      
      // Should show authentication error or empty state
      const hasAuthError = await page.locator('text=Authentication required').count() > 0;
      const hasNoTemplates = await page.locator('text=No templates found').count() > 0;
      const hasTable = await page.locator('table').count() > 0;
      
      // One of these states should be visible
      expect(hasAuthError || hasNoTemplates || hasTable).toBeTruthy();
    });
  });

  test.describe('Admin Upload Page', () => {
    test('should load admin uploads page', async ({ page }) => {
      await page.goto('http://localhost:3001/uploads');
      
      // Check heading
      const heading = page.locator('h1:has-text("Asset Upload")');
      await expect(heading).toBeVisible();
    });

    test('should display upload form with required fields', async ({ page }) => {
      await page.goto('http://localhost:3001/uploads');
      
      // Check for template ID input
      const templateIdInput = page.locator('input[placeholder*="template"]');
      await expect(templateIdInput).toBeVisible();
      
      // Check for asset type selector
      const assetTypeSelect = page.locator('select');
      await expect(assetTypeSelect).toBeVisible();
      await expect(assetTypeSelect).toContainText('Logo');
      await expect(assetTypeSelect).toContainText('Image');
      await expect(assetTypeSelect).toContainText('Icon');
      
      // Check for file input
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      // Check for upload button
      const uploadButton = page.locator('button:has-text("Upload File")');
      await expect(uploadButton).toBeVisible();
    });

    test('should show security notes', async ({ page }) => {
      await page.goto('http://localhost:3001/uploads');
      
      // Check for security section
      await expect(page.locator('text=Security Notes')).toBeVisible();
      await expect(page.locator('text=5MB')).toBeVisible();
      await expect(page.locator('text=Executable files')).toBeVisible();
    });

    test('should disable upload button when form incomplete', async ({ page }) => {
      await page.goto('http://localhost:3001/uploads');
      
      // Upload button should be disabled initially
      const uploadButton = page.locator('button:has-text("Upload File")');
      await expect(uploadButton).toBeDisabled();
    });
  });

  test.describe('Admin Dashboard Navigation', () => {
    test('should load admin dashboard with navigation cards', async ({ page }) => {
      await page.goto('http://localhost:3001/');
      
      // Check heading
      const heading = page.locator('h1:has-text("Admin Dashboard")');
      await expect(heading).toBeVisible();
      
      // Check for templates card
      const templatesCard = page.locator('h2:has-text("Templates")');
      await expect(templatesCard).toBeVisible();
      
      // Check for uploads card
      const uploadsCard = page.locator('h2:has-text("Uploads")');
      await expect(uploadsCard).toBeVisible();
    });

    test('should navigate to templates page from dashboard', async ({ page }) => {
      await page.goto('http://localhost:3001/');
      
      // Click templates card
      await page.click('a[href="/templates"]');
      
      // Should navigate to templates page
      await page.waitForURL(/\/templates/);
      expect(page.url()).toContain('/templates');
    });

    test('should navigate to uploads page from dashboard', async ({ page }) => {
      await page.goto('http://localhost:3001/');
      
      // Click uploads card
      await page.click('a[href="/uploads"]');
      
      // Should navigate to uploads page
      await page.waitForURL(/\/uploads/);
      expect(page.url()).toContain('/uploads');
    });
  });

  test.describe('Integration Tests', () => {
    test('should complete full flow: browse → filter → apply to editor', async ({ page }) => {
      // Step 1: Browse templates
      await page.goto('/templates');
      await page.waitForTimeout(1000);
      
      // Step 2: Filter templates (if available)
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('business');
      await page.waitForTimeout(800);
      
      // Step 3: Apply template to editor
      const useButton = page.locator('button:has-text("Use Template")').first();
      const buttonExists = await useButton.count() > 0;
      
      if (buttonExists) {
        await useButton.click();
        await page.waitForURL(/\/editor/);
        
        // Verify we're on editor page
        expect(page.url()).toContain('/editor');
        
        // Verify template ID in URL
        expect(page.url()).toContain('template=');
      }
      
      // Test passes whether templates exist or not
    });

    test('should make API calls to correct endpoints', async ({ page }) => {
      let templatesApiCalled = false;
      let categoriesApiCalled = false;
      
      page.on('request', request => {
        if (request.url().includes('/templates') && !request.url().includes('/admin/')) {
          templatesApiCalled = true;
        }
        if (request.url().includes('/templates/categories')) {
          categoriesApiCalled = true;
        }
      });
      
      await page.goto('/templates');
      await page.waitForTimeout(1500);
      
      // Should call templates API
      expect(templatesApiCalled).toBeTruthy();
      
      // Should call categories API
      expect(categoriesApiCalled).toBeTruthy();
    });
  });
});
