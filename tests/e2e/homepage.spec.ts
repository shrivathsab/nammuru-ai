import { test, expect } from '@playwright/test';

test('homepage loads with Nammooru branding', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Nammooru/i);
  // Kannada tagline renders
  await expect(page.locator('text=ನಮ್ಮ ಊರು').first()).toBeVisible();
  // Pilot ward card present
  await expect(page.locator('text=HSR Layout').first()).toBeVisible({ timeout: 10_000 });
  // Live map (Leaflet) renders
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
});

test('map page loads the ward map', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
});
