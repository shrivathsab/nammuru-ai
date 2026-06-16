import { test, expect } from '@playwright/test';

test('a seeded report is retrievable via the reports API', async ({ request }) => {
  // Uses a seeded report if present; skips gracefully otherwise.
  const res = await request.get('/api/reports/NMR-20260430-B126');
  test.skip(res.status() === 404, 'Skipped: NMR-20260430-B126 not seeded');

  const data = await res.json();
  expect(data).toHaveProperty('report_id_human', 'NMR-20260430-B126');
  // The reports API must now expose the agent lifecycle fields (Gap 1B fix).
  expect(data).toHaveProperty('email_sent_at');
  expect(data).toHaveProperty('auto_dispatch');
});
