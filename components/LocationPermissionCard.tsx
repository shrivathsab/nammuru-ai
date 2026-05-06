'use client'

function getDeviceInfo() {
  if (typeof window === 'undefined') return { isIOS: false, isAndroid: false, isMobile: false, browser: 'chrome' as const }
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  const isAndroid = /Android/.test(ua)
  const isSafari = isIOS || (/^((?!chrome|android).)*safari/i.test(ua))
  const isFirefox = /Firefox/.test(ua)
  return {
    isIOS,
    isAndroid,
    isMobile: isIOS || isAndroid,
    browser: (isSafari ? 'safari' : isFirefox ? 'firefox' : 'chrome') as 'safari' | 'firefox' | 'chrome',
  }
}

export type LocationCardState = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'manual'

interface LocationPermissionCardProps {
  state: LocationCardState
  onRetry: () => void
  onManual: () => void
}

function getSteps(state: 'denied' | 'unavailable', device: ReturnType<typeof getDeviceInfo>) {
  if (state === 'unavailable') {
    return {
      icon: '📡',
      title: 'Location signal weak',
      body: 'GPS is having trouble finding you. Try moving to an open area or entering your location manually.',
      steps: [] as string[],
    }
  }

  if (device.isIOS && device.browser === 'safari') {
    return {
      icon: '📍',
      title: 'Location blocked in Safari',
      body: 'Nammooru needs your location to route the report to the right BBMP officer.',
      steps: [
        'Tap the "AA" icon in the address bar',
        'Tap "Website Settings"',
        'Set Location → "Allow"',
        'Come back and tap "Try again"',
      ],
    }
  }
  if (device.isAndroid) {
    return {
      icon: '📍',
      title: 'Location blocked',
      body: 'Nammooru needs your location to route the report to the right BBMP officer.',
      steps: [
        'Tap the 🔒 lock icon in the address bar',
        'Tap "Permissions"',
        'Set Location → "Allow"',
        'Come back and tap "Try again"',
      ],
    }
  }
  return {
    icon: '📍',
    title: 'Location access blocked',
    body: 'Nammooru needs your location to route the report to the right BBMP officer.',
    steps: [
      'Click the 🔒 lock icon in the address bar',
      'Click "Site settings"',
      'Set Location → "Allow"',
      'Refresh this page',
    ],
  }
}

export default function LocationPermissionCard({
  state,
  onRetry,
  onManual,
}: LocationPermissionCardProps) {
  const device = getDeviceInfo()

  if (state === 'idle' || state === 'requesting') {
    return (
      <div style={{
        background: '#0e1a15',
        borderLeft: '4px solid #0F6E56',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <div style={{ fontSize: 22, marginTop: 2 }}>📍</div>
        <div>
          <div style={{
            color: '#f0ede8',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 4,
          }}>
            {state === 'requesting' ? 'Allow location access' : 'Getting your location…'}
          </div>
          <div style={{
            color: '#8a9e96',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            {state === 'requesting'
              ? 'Tap "Allow" when your browser asks. This routes your report to the right BBMP ward officer.'
              : 'Detecting your ward automatically…'}
          </div>
        </div>
      </div>
    )
  }

  if (state === 'manual') return null

  const { icon, title, body, steps } = getSteps(state, device)

  return (
    <div style={{
      background: '#1a0e0e',
      borderLeft: '4px solid #d97706',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          color: '#d97706',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          fontWeight: 600,
        }}>
          {title}
        </span>
      </div>

      <p style={{
        color: '#8a9e96',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
        margin: '0 0 12px',
      }}>
        {body}
      </p>

      {steps.length > 0 && (
        <ol style={{
          margin: '0 0 14px',
          paddingLeft: 20,
          color: '#f0ede8',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          lineHeight: 1.8,
        }}>
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            background: '#0F6E56',
            color: 'white',
            border: 'none',
            borderRadius: 20,
            padding: '10px 16px',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <button
          onClick={onManual}
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px solid #8a9e96',
            color: '#8a9e96',
            borderRadius: 20,
            padding: '10px 16px',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
          }}
        >
          Enter manually
        </button>
      </div>
    </div>
  )
}

const PILOT_WARDS = [
  { name: 'HSR Layout Ward', lat: 12.9116, lng: 77.637, zone: 'Bommanahalli' },
  { name: 'Koramangala Ward', lat: 12.9279, lng: 77.6271, zone: 'South' },
  { name: 'Indiranagar Ward', lat: 12.9784, lng: 77.6408, zone: 'East' },
  { name: 'Whitefield Ward', lat: 12.9698, lng: 77.7499, zone: 'East' },
  { name: 'Jayanagar Ward', lat: 12.9250, lng: 77.5938, zone: 'South' },
]

export function ManualLocationCard({
  onWardSelect,
}: {
  onWardSelect: (ward: string, lat: number, lng: number) => void
}) {
  return (
    <div style={{
      background: '#0e1a15',
      borderLeft: '4px solid #0F6E56',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{
        color: '#0F6E56',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        SELECT YOUR WARD
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PILOT_WARDS.map(w => (
          <button
            key={w.name}
            onClick={() => onWardSelect(w.name, w.lat, w.lng)}
            style={{
              background: '#080f0c',
              border: '1px solid rgba(15,110,86,0.3)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{ color: '#f0ede8', fontSize: 14 }}>{w.name.replace(' Ward', '')}</span>
            <span style={{ color: '#8a9e96', fontSize: 12 }}>{w.zone} Zone →</span>
          </button>
        ))}
      </div>
      <p style={{
        color: '#8a9e96',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
        marginTop: 10,
        lineHeight: 1.5,
      }}>
        Outside these wards? Reports route to BBMP Central Grievance Cell.
      </p>
    </div>
  )
}
