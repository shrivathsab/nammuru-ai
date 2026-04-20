export function assignTriage(
  issueType: string,
  severity: string,
  clusterCount: number,
): { level: 1 | 2 | 3; label: string; reason: string } {
  // LEVEL 1 — URGENT
  if (severity === 'high') {
    return { level: 1, label: 'Urgent', reason: 'High severity issue requires immediate attention' };
  }
  if (clusterCount >= 10) {
    return { level: 1, label: 'Urgent', reason: `${clusterCount} reports at this location indicate a systemic problem` };
  }
  if (issueType === 'Encroachment') {
    return { level: 1, label: 'Urgent', reason: 'Encroachment requires immediate legal attention' };
  }

  // LEVEL 2 — MEDIUM
  if (severity === 'medium' && (issueType === 'Pothole' || issueType === 'Garbage' || issueType === 'Waterlogging')) {
    return { level: 2, label: 'Medium', reason: 'Moderate issue — schedule within the week' };
  }
  if (clusterCount >= 3 && clusterCount <= 9) {
    return { level: 2, label: 'Medium', reason: 'Moderate issue — schedule within the week' };
  }

  // LEVEL 3 — ROUTINE
  return { level: 3, label: 'Routine', reason: 'Routine issue — add to regular maintenance schedule' };
}
