import { test, expect } from '@playwright/test';

test('classify API returns 429 after exceeding the rate limit', async ({ request }) => {
  // Rate limits are relaxed in development (NODE_ENV=development → 200/min),
  // so this assertion only holds in a production-like build. Skip in dev.
  const isDev = process.env.IS_DEV === 'true' || process.env.NODE_ENV !== 'production';
  test.skip(isDev, 'Rate limit test skipped outside a production build');

  const coords = { lat: 12.9116, lng: 77.637 };
  const fakeImage = Buffer.from('fake').toString('base64');
  const makeRequest = () =>
    request.post('/api/classify', {
      data: { image_base64: fakeImage, ...coords },
      headers: { 'x-forwarded-for': '203.0.113.55' },
    });

  for (let i = 0; i < 5; i++) await makeRequest();
  const sixth = await makeRequest();
  expect(sixth.status()).toBe(429);
});
