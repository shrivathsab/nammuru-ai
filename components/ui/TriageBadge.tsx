'use client'

import { tokens } from '@/lib/design-tokens'

interface TriageBadgeProps {
  level: 1 | 2 | 3
}

export function TriageBadge({ level }: TriageBadgeProps) {
  const cfg = tokens.triage[level]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      fontFamily: tokens.fonts.mono,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      background: `${cfg.color}1a`,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}
