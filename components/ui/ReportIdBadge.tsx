'use client'

import { tokens } from '@/lib/design-tokens'

interface ReportIdBadgeProps {
  id: string
}

export function ReportIdBadge({ id }: ReportIdBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.75rem',
      borderRadius: '9999px',
      background: tokens.colors.teal,
      color: 'white',
      fontFamily: tokens.fonts.mono,
      fontSize: '0.68rem',
      fontWeight: 500,
    }}>
      {id}
    </span>
  )
}
