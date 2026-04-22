'use client'

import { tokens } from '@/lib/design-tokens'

const variantColor = {
  teal:  tokens.colors.teal,
  red:   tokens.colors.red,
  amber: tokens.colors.amber,
  gold:  tokens.colors.gold,
} as const

interface CardProps {
  children: React.ReactNode
  variant?: 'teal' | 'red' | 'amber' | 'gold'
}

export function Card({ children, variant = 'teal' }: CardProps) {
  return (
    <div style={{
      background: tokens.colors.dark2,
      borderRadius: '0.75rem',
      padding: '1rem',
      borderTop: '1px solid rgba(138,158,150,0.12)',
      borderRight: '1px solid rgba(138,158,150,0.12)',
      borderBottom: '1px solid rgba(138,158,150,0.12)',
      borderLeft: `4px solid ${variantColor[variant]}`,
    }}>
      {children}
    </div>
  )
}
