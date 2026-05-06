'use client'

interface DeviceInfo {
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  browser:
    | 'safari'
    | 'chrome-ios'
    | 'firefox-ios'
    | 'edge-ios'
    | 'opera-ios'
    | 'chrome'
    | 'samsung'
    | 'miui'
    | 'opera'
    | 'uc'
    | 'firefox'
    | 'edge'
    | 'edge-android'
    | 'safari-desktop'
    | 'brave'
    | 'duckduckgo'
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { isIOS: false, isAndroid: false, isMobile: false, browser: 'chrome' }
  }
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  const isAndroid = /Android/.test(ua)
  const isMobile = isIOS || isAndroid
  let browser: DeviceInfo['browser']

  if (isIOS) {
    if      (/CriOS/.test(ua))       browser = 'chrome-ios'
    else if (/FxiOS/.test(ua))       browser = 'firefox-ios'
    else if (/EdgiOS/.test(ua))      browser = 'edge-ios'
    else if (/OPiOS/.test(ua))       browser = 'opera-ios'
    else if (/DuckDuckGo/.test(ua))  browser = 'duckduckgo'
    else                             browser = 'safari'

  } else if (isAndroid) {
    if      (/SamsungBrowser/.test(ua)) browser = 'samsung'
    else if (/MiuiBrowser/.test(ua))    browser = 'miui'
    else if (/UCBrowser/.test(ua))      browser = 'uc'
    else if (/OPR\//.test(ua))          browser = 'opera'
    else if (/EdgA/.test(ua))           browser = 'edge-android'
    else if (/Firefox\//.test(ua))      browser = 'firefox'
    else if (/Brave/.test(ua))          browser = 'brave'
    else if (/DuckDuckGo/.test(ua))     browser = 'duckduckgo'
    else                                browser = 'chrome'

  } else {
    if      (/Edg\//.test(ua) && !/EdgA|EdgiOS/.test(ua)) browser = 'edge'
    else if (/Firefox\//.test(ua))                         browser = 'firefox'
    else if (/Safari/.test(ua) && !/Chrome/.test(ua))     browser = 'safari-desktop'
    else if (/Brave/.test(ua))                             browser = 'brave'
    else                                                   browser = 'chrome'
  }

  return { isIOS, isAndroid, isMobile, browser }
}

const getPermissionSteps: Record<DeviceInfo['browser'], string[]> = {
  'safari': [
    'Tap the "AA" icon in the address bar',
    'Tap "Website Settings"',
    'Set Location → "Allow"',
    'Come back and tap "Try again"',
  ],
  'chrome-ios': [
    'Tap the ⋮ menu in the top-right corner',
    'Tap Settings → Content Settings → Location',
    'Allow nammooru.in, then tap "Try again"',
    'If blocked: go to iPhone Settings → Chrome → Location → Allow',
  ],
  'firefox-ios': [
    'Go to iPhone Settings → Firefox',
    'Tap Location → While Using the App',
    'Return here and tap "Try again"',
  ],
  'edge-ios': [
    'Go to iPhone Settings → Edge',
    'Tap Location → While Using the App',
    'Return here and tap "Try again"',
  ],
  'opera-ios': [
    'Go to iPhone Settings → Opera Mini',
    'Tap Location → While Using the App',
    'Return here and tap "Try again"',
  ],
  'chrome': [
    'Tap the 🔒 lock icon in the address bar',
    'Tap "Permissions"',
    'Set Location → "Allow"',
    'Come back and tap "Try again"',
  ],
  'samsung': [
    'Tap the ≡ menu at the bottom-right',
    'Tap Settings → Sites and downloads',
    'Tap Site permissions → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
  'miui': [
    'Tap the ≡ or ⋮ menu',
    'Tap Settings → Advanced settings → Site settings',
    'Tap Location → Allow nammooru.in',
    'Tap "Try again"',
  ],
  'opera': [
    'Tap ⋮ menu → Site settings → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
  'uc': [
    'Tap ⋮ menu → Settings → Site settings → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
  'firefox': [
    'Click the 🔒 lock icon in the address bar',
    'Click "Site settings"',
    'Set Location → "Allow"',
    'Refresh this page',
  ],
  'edge': [
    'Click 🔒 in the address bar',
    'Click Permissions for this site → Location → Allow',
    'Reload the page',
  ],
  'edge-android': [
    'Tap the ⋯ menu at the bottom',
    'Tap Settings → Site permissions → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
  'safari-desktop': [
    'Click Safari menu → Settings → Websites',
    'Click Location → set nammooru.in to Allow',
    'Reload the page',
  ],
  'brave': [
    'Tap ⋮ menu → Site settings → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
  'duckduckgo': [
    'Tap the ⋮ or fire menu',
    'Tap Settings → Site Permissions → Location',
    'Allow nammooru.in, then tap "Try again"',
  ],
}

export type LocationCardState = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'manual'

interface LocationPermissionCardProps {
  state: LocationCardState
  onRetry: () => void
  onManual: () => void
}

function getSteps(state: 'denied' | 'unavailable', device: DeviceInfo) {
  if (state === 'unavailable') {
    return {
      icon: '📡',
      title: 'Location signal weak',
      body: 'GPS is having trouble finding you. Try moving to an open area or entering your location manually.',
      steps: [] as string[],
    }
  }

  const title = device.isIOS && device.browser === 'safari'
    ? 'Location blocked in Safari'
    : device.isMobile
      ? 'Location blocked'
      : 'Location access blocked'

  return {
    icon: '📍',
    title,
    body: 'Nammooru needs your location to route the report to the right BBMP officer.',
    steps: getPermissionSteps[device.browser],
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
