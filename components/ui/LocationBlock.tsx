'use client'

import { MapPin, Navigation, Landmark, Building2 } from 'lucide-react'
import { tokens } from '@/lib/design-tokens'

interface LocationBlockProps {
  locality?: string
  road?: string
  pincode?: string
  landmark?: string
  wardName?: string
  zone?: string
}

export function LocationBlock({ locality, road, pincode, landmark, wardName, zone }: LocationBlockProps) {
  return (
    <div style={{
      background: tokens.colors.dark3,
      borderRadius: '0.625rem',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.375rem',
    }}>
      {locality && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: tokens.colors.textPrimary }}>
          <MapPin size={14} style={{ flexShrink: 0, color: tokens.colors.teal }} />
          <span>{locality}, Bengaluru</span>
        </div>
      )}
      {(road ?? pincode) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: tokens.colors.textMuted }}>
          <Navigation size={12} style={{ flexShrink: 0, color: tokens.colors.teal }} />
          <span>{[road, pincode ? `· PIN ${pincode}` : null].filter(Boolean).join(' ')}</span>
        </div>
      )}
      {landmark && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: tokens.colors.textMuted }}>
          <Landmark size={12} style={{ flexShrink: 0, color: tokens.colors.teal }} />
          <span>Near {landmark}</span>
        </div>
      )}
      {wardName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: tokens.colors.textMuted }}>
          <Building2 size={12} style={{ flexShrink: 0, color: tokens.colors.teal }} />
          <span>{wardName}{zone ? ` · ${zone} Zone` : ''}</span>
        </div>
      )}
    </div>
  )
}
