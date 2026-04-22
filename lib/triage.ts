export type TriageLevel = { level: 1 | 2 | 3; label: string; reason: string };

const TRIAGE_LEVELS: Record<1 | 2 | 3, TriageLevel> = {
  1: { level: 1, label: 'Urgent', reason: 'Validated urgent issue — immediate attention required' },
  2: { level: 2, label: 'Medium', reason: 'Moderate issue — schedule within the week' },
  3: { level: 3, label: 'Routine', reason: 'Routine issue — add to regular maintenance schedule' },
};

export function assignTriage(
  issueType: string,
  severity: 'high' | 'medium' | 'low',
  clusterCount: number,
  confidence: number = 0.75,
): TriageLevel {
  // L1 URGENT: requires community validation OR unambiguous issue type
  // Single high-severity report without cluster support → L2
  if (issueType === 'Encroachment') return TRIAGE_LEVELS[1];
  if (clusterCount >= 10) return TRIAGE_LEVELS[1];
  if (severity === 'high' && clusterCount >= 2) return TRIAGE_LEVELS[1];
  if (severity === 'high' && confidence >= 0.85 && clusterCount >= 1) return TRIAGE_LEVELS[1];

  // L2 MEDIUM: high severity single report, or medium severity with cluster
  if (severity === 'high') return TRIAGE_LEVELS[2]; // demoted from L1
  if (severity === 'medium' && clusterCount >= 3) return TRIAGE_LEVELS[2];
  if (severity === 'medium') return TRIAGE_LEVELS[2];

  // L3 ROUTINE: everything else
  return TRIAGE_LEVELS[3];
}
