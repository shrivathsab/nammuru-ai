'use client'

import { tokens } from '@/lib/design-tokens'

type StatusType = 'valid' | 'rejected' | 'warning' | 'info' | 'manual'

const statusStyles: Record<StatusType, { bg: string; color: string; border?: string }> = {
  valid:    { bg: `${tokens.colors.teal}1a`,  color: tokens.colors.teal },
  rejected: { bg: `${tokens.colors.red}1a`,   color: tokens.colors.red },
  warning:  { bg: `${tokens.colors.amber}1a`, color: tokens.colors.amber },
  info:     { bg: tokens.colors.dark3, color: tokens.colors.teal, border: `1px solid ${tokens.colors.teal}` },
  manual:   { bg: `${tokens.colors.gold}1a`,  color: tokens.colors.gold },
}

interface StatusPillProps {
  status: StatusType
  label: string
}

export function StatusPill({ status, label }: StatusPillProps) {
  const s = statusStyles[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.75rem',
      borderRadius: '9999px',
      background: s.bg,
      color: s.color,
      border: s.border,
      fontSize: '0.72rem',
      fontWeight: 500,
      fontFamily: tokens.fonts.mono,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  )
}
