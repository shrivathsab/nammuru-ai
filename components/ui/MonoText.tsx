'use client'

import { tokens } from '@/lib/design-tokens'

interface MonoTextProps {
  children: React.ReactNode
  color?: string
}

export function MonoText({ children, color = tokens.colors.textMuted }: MonoTextProps) {
  return (
    <span style={{
      fontFamily: tokens.fonts.mono,
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color,
    }}>
      {children}
    </span>
  )
}
