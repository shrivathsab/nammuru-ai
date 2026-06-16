import { describe, it, expect } from 'vitest';
import { computePHash, pHashDistance, PHASH_THRESHOLDS } from '@/lib/phash';

// 1×1 PNG — valid image sharp can resize to 16×16.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('pHashDistance', () => {
  it('is 0 for identical hashes', () => {
    expect(pHashDistance('a3f4b2c1d5e6f7a8', 'a3f4b2c1d5e6f7a8')).toBe(0);
  });

  it('detects a 1-bit difference', () => {
    expect(pHashDistance('a3f4b2c1d5e6f7a8', 'a3f4b2c1d5e6f7a9')).toBe(1);
  });

  it('classifies the identical threshold (<= 5)', () => {
    expect(pHashDistance('0000000000000000', '0000000000000001')).toBeLessThanOrEqual(
      PHASH_THRESHOLDS.IDENTICAL,
    );
  });

  it('classifies the dissimilar threshold (> 15)', () => {
    expect(pHashDistance('0000000000000000', 'ffffffffffffffff')).toBeGreaterThan(
      PHASH_THRESHOLDS.SIMILAR,
    );
  });

  it('returns 999 for mismatched lengths', () => {
    expect(pHashDistance('abc', 'abcd')).toBe(999);
  });
});

describe('computePHash', () => {
  it('returns a deterministic hex string for a valid image', async () => {
    const h1 = await computePHash(TINY_PNG);
    const h2 = await computePHash(TINY_PNG);
    expect(h1).toMatch(/^[0-9a-f]+$/);
    expect(h1).toBe(h2);
  });

  it('returns null for empty input', async () => {
    expect(await computePHash('')).toBeNull();
  });
});
