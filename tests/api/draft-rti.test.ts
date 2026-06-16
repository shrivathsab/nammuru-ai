import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { createMock, getServerClientMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getServerClientMock: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: createMock };
  },
}));
vi.mock('@/lib/supabase', () => ({ getServerClient: getServerClientMock }));

import { POST } from '@/app/api/draft-rti/route';

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

const RTI_TEXT = [
  'To,',
  'The Public Information Officer, South City Corporation',
  'Greater Bengaluru Authority, Bengaluru',
  '',
  'Under the Right to Information Act 2005 Section 6(1), and with reference to',
  'the Greater Bengaluru Governance Act 2024 and BBMP Act 1976 Section 58,',
  'regarding complaint NMR-20260430-B126:',
  '',
  '[Name]',
  '[Address]',
].join('\n');

const mockReport = {
  id: 'uuid-rti-1',
  report_id_human: 'NMR-20260430-B126',
  created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  issue_type: 'Garbage',
  severity: 'high',
  triage_level: 1,
  ward_name: 'HSR Layout Ward',
  ward_zone: 'South',
  locality_name: 'HSR Layout Sector 2',
  rti_draft: null,
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/draft-rti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue({ content: [{ type: 'text', text: RTI_TEXT }] });
  getServerClientMock.mockReturnValue(supabaseFor({ data: mockReport, error: null }));
});

describe('POST /api/draft-rti', () => {
  it('generates an RTI draft with legal references', async () => {
    const res = await POST(makeRequest({ report_id_human: 'NMR-20260430-B126' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rti_draft).toMatch(/RTI Act 2005|Right to Information Act 2005/);
  });

  it('RTI draft references the original report ID', async () => {
    const res = await POST(makeRequest({ report_id_human: 'NMR-20260430-B126' }));
    const data = await res.json();
    expect(data.rti_draft).toContain('NMR-20260430-B126');
  });

  it('RTI draft keeps the [Name] placeholder for the citizen', async () => {
    const res = await POST(makeRequest({ report_id_human: 'NMR-20260430-B126' }));
    const data = await res.json();
    expect(data.rti_draft).toMatch(/\[Name\]/);
  });

  it('is idempotent — returns the existing draft if already generated', async () => {
    getServerClientMock.mockReturnValue(
      supabaseFor({ data: { ...mockReport, rti_draft: 'Existing RTI text...' }, error: null }),
    );
    const res = await POST(makeRequest({ report_id_human: 'NMR-20260430-B126' }));
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe('already_drafted');
    expect(data.rti_draft).toBe('Existing RTI text...');
  });

  it('returns 400 when report_id_human is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
