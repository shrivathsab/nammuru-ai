'use client'

import { tokens } from '@/lib/design-tokens'
import { TealSpinner } from './TealSpinner'

interface TealButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function TealButton({
  children,
  onClick,
  disabled,
  loading,
  fullWidth,
  variant = 'primary',
}: TealButtonProps) {
  const isDisabled = disabled || loading

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '9999px',
    fontWeight: 600,
    fontSize: '1rem',
    fontFamily: tokens.fonts.sans,
    minHeight: '52px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: disabled && !loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
  }

  const content = loading ? (
    <><TealSpinner size="sm" /> Loading...</>
  ) : children

  if (variant === 'secondary') {
    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className="btn-outline-teal"
        style={{ ...base, background: tokens.colors.dark3, border: `1px solid ${tokens.colors.teal}`, color: tokens.colors.teal }}
      >
        {content}
      </button>
    )
  }

  if (variant === 'ghost') {
    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className="btn-ghost-teal"
        style={{ ...base, background: 'transparent', border: 'none', color: tokens.colors.teal }}
      >
        {content}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="btn-teal-glow"
      style={{ ...base, background: tokens.colors.teal, border: 'none', color: 'white' }}
    >
      {content}
    </button>
  )
}
