import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getServerClientMock } = vi.hoisted(() => ({ getServerClientMock: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getServerClient: getServerClientMock }));

import { POST } from '@/app/api/upvote/route';

interface ClientOpts {
  report?: Record<string, unknown> | null;
  monthlyCount?: number;
  insertError?: { code?: string } | null;
  existingSwarm?: { id: string } | null;
}

function makeClient(opts: ClientOpts) {
  const reports = {
    select: vi.fn(() => reports),
    eq: vi.fn(() => reports),
    update: vi.fn(() => reports),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.report ?? null,
      error: opts.report ? null : { message: 'not found' },
    }),
    then: (r: (v: unknown) => void) => r({ data: null, error: null }),
  };
  const upvotes = {
    select: vi.fn(() => upvotes),
    eq: vi.fn(() => upvotes),
    insert: vi.fn().mockResolvedValue({ error: opts.insertError ?? null }),
    then: (r: (v: unknown) => void) =>
      r({ count: opts.monthlyCount ?? 0, data: [], error: null }),
  };
  const swarms = {
    select: vi.fn(() => swarms),
    contains: vi.fn(() => swarms),
    eq: vi.fn(() => swarms),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingSwarm ?? null, error: null }),
  };
  return {
    from: vi.fn((table: string) =>
      table === 'reports' ? reports : table === 'report_upvotes' ? upvotes : swarms,
    ),
  };
}

const nearReport = {
  id: 'uuid-r1',
  lat: 12.9116,
  lng: 77.637,
  status: 'open',
  cluster_count: 1,
  upvote_count: 0,
  triage_level: 2,
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/upvote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  report_id_human: 'NMR-1',
  lat: 12.9116,
  lng: 77.637,
  device_hash: 'd'.repeat(64),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  getServerClientMock.mockReturnValue(makeClient({ report: nearReport }));
});

describe('POST /api/upvote', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ report_id_human: 'NMR-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown report', async () => {
    getServerClientMock.mockReturnValue(makeClient({ report: null }));
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error_code).toBe('not_found');
  });

  it('rejects an upvote on a resolved report', async () => {
    getServerClientMock.mockReturnValue(makeClient({ report: { ...nearReport, status: 'resolved' } }));
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error_code).toBe('already_resolved');
  });

  it('rejects an upvote from > 200m away (too_far)', async () => {
    const res = await POST(makeRequest({ ...validBody, lat: 13.5, lng: 78.0 }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error_code).toBe('too_far');
  });

  it('accepts a GPS-verified upvote within 200m', async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.new_upvote_count).toBe(1);
  });

  it('rejects a duplicate upvote from the same device (already_upvoted)', async () => {
    getServerClientMock.mockReturnValue(makeClient({ report: nearReport, insertError: { code: '23505' } }));
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error_code).toBe('already_upvoted');
  });

  it('rejects once the monthly limit is reached', async () => {
    getServerClientMock.mockReturnValue(makeClient({ report: nearReport, monthlyCount: 5 }));
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(429);
    expect(data.error_code).toBe('monthly_limit');
  });

  it('triggers a swarm when the signal score reaches 15', async () => {
    // cluster_count 5 → signal = 5*3 + 1 = 16 ≥ 15, and no existing swarm.
    getServerClientMock.mockReturnValue(
      makeClient({ report: { ...nearReport, cluster_count: 5 }, existingSwarm: null }),
    );
    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.swarm_triggered).toBe(true);
  });
});
