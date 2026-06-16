import { describe, it, expect } from 'vitest';
import { isInsideBengaluru } from '@/lib/geofence';

describe('Bengaluru geofence', () => {
  it('accepts a central Bengaluru coordinate', () => {
    expect(isInsideBengaluru(12.9716, 77.5946)).toBe(true);
  });

  it('accepts HSR Layout (pilot ward)', () => {
    expect(isInsideBengaluru(12.9116, 77.6370)).toBe(true);
  });

  it('accepts Whitefield (pilot ward)', () => {
    expect(isInsideBengaluru(12.9698, 77.7499)).toBe(true);
  });

  it('rejects Delhi coordinates', () => {
    expect(isInsideBengaluru(28.6139, 77.2090)).toBe(false);
  });

  it('rejects Mumbai coordinates', () => {
    expect(isInsideBengaluru(19.0760, 72.8777)).toBe(false);
  });

  it('rejects null island (0, 0)', () => {
    expect(isInsideBengaluru(0, 0)).toBe(false);
  });

  it('rejects coordinates just outside the north bound', () => {
    expect(isInsideBengaluru(13.145, 77.65)).toBe(false);
  });

  it('accepts the south-west boundary corner (inclusive)', () => {
    expect(isInsideBengaluru(12.834, 77.461)).toBe(true);
  });
});
