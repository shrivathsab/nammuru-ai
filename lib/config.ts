export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://nammuru-ai.vercel.app'
).replace(/\/$/, ''); // remove trailing slash

export function reportUrl(reportId: string): string {
  return `${APP_URL}/report/${reportId}`;
}

export function reportDisplayUrl(reportId: string): string {
  // For display only — strip protocol for clean look
  return `${APP_URL.replace(/^https?:\/\//, '')}/report/${reportId}`;
}
