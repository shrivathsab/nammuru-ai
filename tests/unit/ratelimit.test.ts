import { describe, it, expect } from 'vitest';
import { getClientIp } from '@/lib/ratelimit';

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/test', { headers });
}

describe('getClientIp', () => {
  it('uses the first IP in x-forwarded-for', () => {
    expect(getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(reqWith({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('defaults to localhost when no IP header is present', () => {
    expect(getClientIp(reqWith({}))).toBe('127.0.0.1');
  });
});
