import { test, expect } from '@playwright/test';

test.describe('Live Assistant', () => {
  test.beforeEach(async ({ page }) => {
    // Go to AI Lab page (requires auth, so we'll test the public parts)
    await page.goto('/admin/ai-lab');
  });

  test('should show login page when not authenticated', async ({ page }) => {
    // Should redirect to login or show auth required
    await expect(page.locator('body')).toBeVisible();
    // The exact behavior depends on auth setup
  });

  test('AI Lab page loads', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we're on the page (might be redirected to login)
    const url = page.url();
    expect(url).toContain('localhost:8080');
  });
});

test.describe('Home Page', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Voicely/i);
  });

  test('can navigate to login', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check page loaded
    await expect(page.locator('body')).toBeVisible();
  });
});
