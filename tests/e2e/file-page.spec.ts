import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('/file page', () => {
  test.beforeEach(async ({ context }) => {
    // Mock geolocation to HSR Layout
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.9116, longitude: 77.637 });
  });

  test('shows the camera zone after location resolves', async ({ page }) => {
    await page.goto('/file');
    await expect(page.locator('text=Take a photo')).toBeVisible({ timeout: 8_000 });
  });

  test('uploading an image enters the classifying state', async ({ page }) => {
    await page.goto('/file');
    await expect(page.locator('text=Take a photo')).toBeVisible({ timeout: 8_000 });

    const fixture = path.join(process.cwd(), 'tests/fixtures/valid-garbage.jpg');
    test.skip(!fs.existsSync(fixture), 'Skipped: tests/fixtures/valid-garbage.jpg not present');

    await page.locator('input[type="file"]').setInputFiles(fixture);
    // The page flips to phase=classifying immediately, before Claude responds.
    await expect(page.locator('text=AI is verifying')).toBeVisible({ timeout: 5_000 });
  });
});
