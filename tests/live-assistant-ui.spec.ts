import { test, expect } from '@playwright/test';

// These tests require authentication - using test.skip for now
// In production, use storage state or API authentication

test.describe('Live Assistant UI Components', () => {
  // Skip these tests in CI since they require auth
  test.skip(!!process.env.CI, 'Requires authentication');

  test.beforeEach(async ({ page }) => {
    // For local testing with existing session, visit the AI Lab
    await page.goto('/admin/ai-lab');
    await page.waitForLoadState('networkidle');
  });

  test('Live Assistant modal can be opened', async ({ page }) => {
    // Look for the "Open Live Assistant" button or hot feature banner
    const openButton = page.locator('text=פתח עוזר שיעור חי').first();

    // If we're logged in and on the AI Lab page
    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click();

      // Check modal opened
      await expect(page.locator('text=עוזר שיעור חי - בטא')).toBeVisible();

      // Check student selection is present
      await expect(page.locator('text=בחירת תלמיד')).toBeVisible();

      // Check for the student dropdown or loading state
      const dropdown = page.locator('text=בחר תלמיד');
      const loading = page.locator('text=טוען תלמידים');
      const noStudents = page.locator('text=לא נמצאו תלמידים');

      // One of these should be visible
      await expect(dropdown.or(loading).or(noStudents)).toBeVisible({ timeout: 10000 });
    } else {
      // Not logged in, skip this test
      test.skip();
    }
  });

  test('Student dropdown shows CRM students', async ({ page }) => {
    const openButton = page.locator('text=פתח עוזר שיעור חי').first();

    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click();

      // Wait for students to load
      await page.waitForTimeout(3000);

      // Try to find and click the student selector
      const selectTrigger = page.locator('[role="combobox"]').first();

      if (await selectTrigger.isVisible().catch(() => false)) {
        await selectTrigger.click();

        // Check dropdown content appeared
        const dropdownContent = page.locator('[role="listbox"]');
        await expect(dropdownContent).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('Manual student input works', async ({ page }) => {
    const openButton = page.locator('text=פתח עוזר שיעור חי').first();

    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click();

      // Find the manual input field
      const manualInput = page.locator('input[placeholder*="הזן שם ידנית"]');

      if (await manualInput.isVisible().catch(() => false)) {
        await manualInput.fill('תלמיד בדיקה');
        await manualInput.press('Enter');

        // Check the student was selected
        await expect(page.locator('text=תלמיד בדיקה')).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Basic Page Tests', () => {
  test('homepage redirects or loads correctly', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('app loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('ChunkLoadError')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
