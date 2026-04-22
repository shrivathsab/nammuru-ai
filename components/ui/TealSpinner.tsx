'use client'

const sizes = { sm: 24, md: 40, lg: 64 } as const

interface TealSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function TealSpinner({ size = 'md' }: TealSpinnerProps) {
  const px = sizes[size]
  const borderWidth = size === 'sm' ? 2 : 3
  return (
    <div style={{
      width: px,
      height: px,
      borderRadius: '50%',
      border: `${borderWidth}px solid rgba(15,110,86,0.2)`,
      borderTopColor: '#0F6E56',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}
