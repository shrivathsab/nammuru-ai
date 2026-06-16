import { describe, it, expect } from 'vitest';
import { assignTriage } from '@/lib/triage';
// Signature: assignTriage(issueType, severity, clusterCount, confidence?)

describe('assignTriage', () => {
  it('assigns L1 to Encroachment regardless of severity', () => {
    expect(assignTriage('Encroachment', 'low', 0).level).toBe(1);
  });

  it('assigns L1 to a large cluster', () => {
    expect(assignTriage('Garbage', 'medium', 10).level).toBe(1);
  });

  it('assigns L1 to high severity with a confirming cluster + high confidence', () => {
    expect(assignTriage('Garbage', 'high', 1, 0.9).level).toBe(1);
  });

  it('demotes a lone high-severity report (no cluster) to L2', () => {
    expect(assignTriage('Garbage', 'high', 0, 0.7).level).toBe(2);
  });

  it('assigns L2 to medium severity without a cluster', () => {
    expect(assignTriage('Garbage', 'medium', 1).level).toBe(2);
  });

  it('assigns L3 to low severity', () => {
    expect(assignTriage('Garbage', 'low', 1).level).toBe(3);
  });

  it('returns a label and reason alongside the level', () => {
    const t = assignTriage('Pothole', 'low', 0);
    expect(t.label).toBeTruthy();
    expect(t.reason).toBeTruthy();
  });
});
