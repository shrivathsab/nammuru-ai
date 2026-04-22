export const tokens = {
  colors: {
    teal: '#0F6E56',
    tealLight: '#1a9b78',
    dark: '#080f0c',
    dark2: '#0e1a15',
    dark3: '#162118',
    gold: '#d4a843',
    red: '#e53e3e',
    amber: '#d97706',
    textPrimary: '#f0ede8',
    textMuted: '#8a9e96',
  },
  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  triage: {
    1: { color: '#e53e3e', label: '⚡ URGENT L1', text: 'URGENT — Fix within 48 hours' },
    2: { color: '#d97706', label: '⏱ MEDIUM L2', text: 'MEDIUM — Fix within 1 week' },
    3: { color: '#0F6E56', label: '✓ ROUTINE L3', text: 'ROUTINE — Add to maintenance schedule' },
  },
} as const
