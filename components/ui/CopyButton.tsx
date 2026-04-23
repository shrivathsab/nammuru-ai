'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { tokens } from '@/lib/design-tokens'

interface CopyButtonProps {
  text: string
  label: string
  variant?: 'teal-outline' | 'gold-solid'
}

export function CopyButton({ text, label, variant = 'teal-outline' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // noop
    }
  }

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.4rem 0.875rem',
    borderRadius: '9999px',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: tokens.fonts.sans,
    transition: 'background 0.2s ease, color 0.2s ease',
  }

  const variantStyle: React.CSSProperties =
    variant === 'gold-solid'
      ? { background: tokens.colors.gold, color: 'white', border: 'none' }
      : { background: 'transparent', color: tokens.colors.teal, border: `1px solid ${tokens.colors.teal}` }

  return (
    <button type="button" onClick={handleClick} style={{ ...baseStyle, ...variantStyle }}>
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> {label}</>}
    </button>
  )
}
