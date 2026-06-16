import { describe, it, expect } from 'vitest';
import {
  PILOT_WARD_CORPORATION,
  VERIFIED_CHANNELS,
  resolveCorporation,
  corporationName,
  resolveChannels,
} from '@/lib/routing';

// Dissolved BBMP zone names that must NOT appear as corporations or contacts.
const DISSOLVED_ZONES = ['Bommanahalli', 'East Zone', 'South Zone', 'West', 'Mahadevapura'];

describe('GBA corporation mapping (post-BBMP, 2 Sept 2025)', () => {
  it('maps HSR Layout / Koramangala / Jayanagar to South City Corporation', () => {
    expect(resolveCorporation('HSR Layout Ward')?.name).toBe('South City Corporation');
    expect(resolveCorporation('Koramangala Ward')?.name).toBe('South City Corporation');
    expect(resolveCorporation('Jayanagar Ward')?.name).toBe('South City Corporation');
  });

  it('maps Indiranagar / Whitefield to East City Corporation', () => {
    expect(resolveCorporation('Indiranagar Ward')?.name).toBe('East City Corporation');
    expect(resolveCorporation('Whitefield Ward')?.name).toBe('East City Corporation');
  });

  it('returns null for an unknown ward', () => {
    expect(resolveCorporation('Nonexistent Ward')).toBeNull();
    expect(resolveCorporation(null)).toBeNull();
  });

  it('corporationName falls back to the GBA when the ward is unknown', () => {
    expect(corporationName('HSR Layout Ward')).toBe('South City Corporation');
    expect(corporationName(undefined)).toBe('Greater Bengaluru Authority');
  });

  it('every pilot ward maps only to a City Corporation, never a dissolved zone', () => {
    for (const info of Object.values(PILOT_WARD_CORPORATION)) {
      expect(info.name).toMatch(/City Corporation$/);
      expect(DISSOLVED_ZONES).not.toContain(info.name);
    }
  });

  it('exposes only verified-live channels', () => {
    expect(VERIFIED_CHANNELS.emailOfRecord).toBe('comm@bbmp.gov.in');
    expect(VERIFIED_CHANNELS.wasteWhatsApp).toBe('+919448197197');
    expect(VERIFIED_CHANNELS.gbaHelpline).toBe('+919480683695');
    expect(VERIFIED_CHANNELS.cpgrams).toBe('https://pgportal.gov.in');
  });
});

describe('resolveChannels routes through verified channels only', () => {
  it('returns the email of record + corporation for an L1 garbage report', () => {
    const { primary, escalation, corporation } = resolveChannels({
      issueType: 'Garbage',
      wardName: 'HSR Layout Ward',
      wardZone: '',
      triageLevel: 1,
    });
    expect(corporation?.name).toBe('South City Corporation');
    const emails = [...primary, ...escalation]
      .filter((c) => c.type === 'email')
      .map((c) => c.contact);
    expect(emails).toContain('comm@bbmp.gov.in');
  });

  it('never emits a dissolved-zone gmail for any pilot ward', () => {
    for (const ward of Object.keys(PILOT_WARD_CORPORATION)) {
      const { primary, escalation } = resolveChannels({
        issueType: 'Garbage',
        wardName: ward,
        wardZone: '',
        triageLevel: 1,
      });
      for (const ch of [...primary, ...escalation]) {
        expect(ch.contact.endsWith('@gmail.com')).toBe(false);
      }
    }
  });
});
