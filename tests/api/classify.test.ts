import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/classify/route';

// 1×1 PNG data URL — small, valid base64 (passes the 5MB size guard).
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/classify (pre-Claude guards)', () => {
  it('returns 400 when image_base64 is missing', async () => {
    const res = await POST(makeRequest({ lat: 12.9116, lng: 77.637 }));
    expect(res.status).toBe(400);
  });

  it('rejects coordinates outside Bengaluru before any Claude call', async () => {
    const res = await POST(makeRequest({ image_base64: TINY_PNG, lat: 28.6139, lng: 77.209 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.is_valid).toBe(false);
    expect(data.rejection_reason).toBe('outside_geofence');
  });

  it('rejects an image larger than 5MB with 413', async () => {
    // ~6MB of base64 payload
    const big = 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024);
    const res = await POST(makeRequest({ image_base64: big, lat: 12.9116, lng: 77.637 }));
    expect(res.status).toBe(413);
  });
});
