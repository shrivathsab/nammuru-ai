import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { sendMock, getServerClientMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getServerClientMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('@/lib/supabase', () => ({ getServerClient: getServerClientMock }));

import { POST } from '@/app/api/agent-dispatch/route';

function supabaseFor(single: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(single),
    then: (r: (v: unknown) => void) => r({ data: null, error: null }),
  };
  return { from: vi.fn(() => chain) };
}

const baseReport = {
  id: 'uuid-123',
  report_id_human: 'NMR-20260501-TEST1',
  auto_dispatch: true,
  email_sent_at: null,
  email_draft: 'Dear Commissioner, the garbage pile at...',
  email_recipient: 'test@bbmp.gov.in',
  email_subject: 'Civic complaint: Garbage',
  triage_level: 1,
  ward_zone: 'South',
  ward_name: 'HSR Layout Ward',
  citizen_email: 'citizen@test.com',
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/agent-dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  sendMock.mockResolvedValue({ data: { id: 'email-123' }, error: null });
  getServerClientMock.mockReturnValue(supabaseFor({ data: baseReport, error: null }));
});

describe('POST /api/agent-dispatch', () => {
  it('sends email and returns success', async () => {
    const res = await POST(makeRequest({ report_id_human: 'NMR-20260501-TEST1' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('skips if auto_dispatch is false', async () => {
    getServerClientMock.mockReturnValue(supabaseFor({ data: { ...baseReport, auto_dispatch: false }, error: null }));
    const res = await POST(makeRequest({ report_id_human: 'x' }));
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe('auto_dispatch_off');
  });

  it('is idempotent — skips if email_sent_at already set', async () => {
    getServerClientMock.mockReturnValue(supabaseFor({ data: { ...baseReport, email_sent_at: '2026-05-01T10:00:00Z' }, error: null }));
    const res = await POST(makeRequest({ report_id_human: 'x' }));
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe('already_sent');
  });

  it('returns 404 for an unknown report ID', async () => {
    getServerClientMock.mockReturnValue(supabaseFor({ data: null, error: { message: 'Not found' } }));
    const res = await POST(makeRequest({ report_id_human: 'NMR-DOESNT-EXIST' }));
    expect(res.status).toBe(404);
  });

  it('CCs the verified email of record (comm@bbmp.gov.in) for L1 — never a dissolved zone gmail', async () => {
    await POST(makeRequest({ report_id_human: 'NMR-20260501-TEST1' }));
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ cc: ['comm@bbmp.gov.in'] }),
    );
    const arg = sendMock.mock.calls[0][0] as { cc?: string[] };
    for (const cc of arg.cc ?? []) {
      expect(cc.endsWith('@gmail.com')).toBe(false);
    }
  });

  it('returns 400 when report_id_human is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
