import { test, expect } from '@playwright/test';

// Read-only production health checks. Zero Claude/Resend calls — cost is zero.
const BASE = process.env.SMOKE_BASE_URL ?? 'https://nammooru.in';

test('homepage returns 200 and renders', async ({ page }) => {
  const res = await page.goto(BASE);
  expect(res?.status()).toBe(200);
  await expect(page.locator('text=Nammooru').first()).toBeVisible({ timeout: 10_000 });
});

test('Kannada tagline renders (not tofu)', async ({ page }) => {
  await page.goto(BASE);
  const tagline = page.locator('text=ನಮ್ಮ ಊರು').first();
  await expect(tagline).toBeVisible();
  const box = await tagline.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(20);
});

test('/map returns 200', async ({ request }) => {
  const res = await request.get(`${BASE}/map`);
  expect(res.status()).toBe(200);
});

test('/api/map-data returns reports + swarms arrays', async ({ request }) => {
  const res = await request.get(`${BASE}/api/map-data`);
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data.reports)).toBe(true);
  expect(Array.isArray(data.swarms)).toBe(true);
});

test('/file loads without JS errors', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 12.9116, longitude: 77.637 });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const res = await page.goto(`${BASE}/file`);
  expect(res?.status()).toBe(200);
  await page.waitForTimeout(3000);
  expect(errors).toHaveLength(0);
});

test('/about returns 200', async ({ request }) => {
  const res = await request.get(`${BASE}/about`);
  expect(res.status()).toBe(200);
});
