'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Camera,
  MapPin,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  Users,
  Search,
} from 'lucide-react'
import { resizeImage } from '@/lib/imageResize'
import type { ClassifyResponse } from '@/lib/types'
import { AppShell } from '@/components/AppShell'
import { LocationBlock } from '@/components/ui/LocationBlock'
import MiniMap from '@/components/MiniMap'
import { tokens } from '@/lib/design-tokens'

interface NearbyReport {
  id: string
  lat: number
  lng: number
  triage_level: number
}

// ─── Design tokens (aliased for inline styles) ───────────────────────────────

const TEAL = tokens.colors.teal
const DARK2 = tokens.colors.dark2
const DARK3 = tokens.colors.dark3
const GOLD = tokens.colors.gold
const RED = tokens.colors.red
const AMBER = tokens.colors.amber
const TEXT_PRIMARY = tokens.colors.textPrimary
const TEXT_MUTED = tokens.colors.textMuted

// ─── Ward center fallbacks for manual location ──────────────────────────────

const WARD_CENTERS: Record<string, { lat: number; lng: number }> = {
  'HSR Layout':   { lat: 12.9116, lng: 77.6370 },
  'Koramangala':  { lat: 12.9279, lng: 77.6271 },
  'Indiranagar':  { lat: 12.9784, lng: 77.6408 },
  'Whitefield':   { lat: 12.9698, lng: 77.7500 },
  'Jayanagar':    { lat: 12.9299, lng: 77.5833 },
}

// ─── Rejection messages ───────────────────────────────────────────────────────

const REJECTION_MESSAGES: Record<string, string> = {
  screenshot: 'Please submit a direct photo, not a photo of a screen.',
  ai_generated: 'This image appears to be AI-generated. Please submit a real photograph.',
  reposted_media: 'This appears to be a forwarded or reposted image. Please submit a fresh photo you took yourself.',
  no_location_context: 'Please step back and capture the issue with its surroundings visible.',
  indoor_scene: 'This appears to be an indoor photo. Please photograph the issue from a public outdoor location.',
  implausible_scene: 'This image does not appear to show a genuine civic issue.',
  non_civic: 'Please submit a photo of a civic issue such as a pothole, garbage, or broken infrastructure.',
  obscene: 'This image cannot be accepted.',
  portrait: 'Please submit a photo of a civic issue, not a person.',
  low_confidence: 'We could not clearly identify a civic issue in this photo. Please try again with a clearer image.',
  outside_geofence: 'This location is outside the BBMP jurisdiction area covered by NammuruAI.',
  parse_error: 'Something went wrong analysing your image. Please try again.',
  irrelevant_content: 'This image does not appear to show a civic issue.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'location' | 'camera' | 'preview' | 'analyzing' | 'result'
type LocationState = 'idle' | 'requesting' | 'denied' | 'timeout' | 'success' | 'manual'

interface Coords {
  lat: number
  lng: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triageConfig(level: 1 | 2 | 3): { color: string; label: string; text: string } {
  if (level === 1) return { color: RED,  label: '⚡ URGENT L1',  text: 'URGENT — Fix within 48 hours' }
  if (level === 2) return { color: AMBER, label: '⏱ MEDIUM L2',  text: 'MEDIUM — Fix within 1 week' }
  return               { color: TEAL,  label: '✓ ROUTINE L3', text: 'ROUTINE — Add to maintenance schedule' }
}

function severityColor(severity: string): string {
  if (severity === 'high')   return RED
  if (severity === 'medium') return AMBER
  return TEAL
}

/** Normalise partial API error payloads into a full ClassifyResponse shape. */
function normaliseResponse(raw: Partial<ClassifyResponse>): ClassifyResponse {
  const userMessage = raw.user_message ||
    REJECTION_MESSAGES[raw.rejection_reason ?? ''] ||
    'Unable to process this image. Please try again.'
  return {
    is_valid:         raw.is_valid         ?? false,
    user_message:     userMessage,
    issue_type:       raw.issue_type       ?? null,
    severity:         raw.severity         ?? null,
    triage_level:     raw.triage_level     ?? null,
    triage_label:     raw.triage_label     ?? null,
    triage_reason:    raw.triage_reason    ?? null,
    description:      raw.description      ?? null,
    confidence:       raw.confidence       ?? null,
    rejection_reason:          raw.rejection_reason          ?? null,
    cluster:                   raw.cluster                   ?? null,
    ward_name:                 raw.ward_name                 ?? null,
    ward_zone:                 raw.ward_zone                 ?? null,
    ward_is_fallback:          raw.ward_is_fallback          ?? false,
    locality_name:             raw.locality_name             ?? null,
    location_details:          raw.location_details          ?? null,
    nearest_landmark:          raw.nearest_landmark          ?? null,
    private_property_detected: raw.private_property_detected ?? false,
    jurisdiction_flag:         raw.jurisdiction_flag         ?? null,
    location_verified:         raw.location_verified         ?? null,
    report_hash:               raw.report_hash               ?? null,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [step, setStep]                             = useState<Step>('location')
  const [coords, setCoords]                         = useState<Coords | null>(null)
  const [locationState, setLocationState]           = useState<LocationState>('idle')
  const [manualInput, setManualInput]               = useState('')
  const [manualError, setManualError]               = useState<string | null>(null)
  const [manualLocation, setManualLocation]         = useState(false)
  const [isMobile, setIsMobile]                     = useState(false)
  const [browser, setBrowser]                       = useState<'chrome' | 'firefox' | 'safari' | 'edge' | 'other'>('other')
  const [locationAccuracy, setLocationAccuracy]     = useState<number | null>(null)
  const [showAccuracyWarning, setShowAccuracyWarning] = useState(false)
  const [showDesktopManualInput, setShowDesktopManualInput] = useState(false)
  const [locationError, setLocationError]           = useState<string | null>(null)
  const [showTryAgainButton, setShowTryAgainButton] = useState(false)
  const [imageDataUrl, setImageDataUrl]             = useState<string | null>(null)
  const [analysisResult, setAnalysisResult]         = useState<ClassifyResponse | null>(null)
  const [analyzeError, setAnalyzeError]             = useState<string | null>(null)
  const [nearbyReports, setNearbyReports]           = useState<NearbyReport[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Show "Try Again" button 5 s after entering timeout state ─────────────

  useEffect(() => {
    if (locationState !== 'timeout') return
    setShowTryAgainButton(false)
    const t = setTimeout(() => setShowTryAgainButton(true), 5_000)
    return () => clearTimeout(t)
  }, [locationState])

  // ── Device / browser detection ────────────────────────────────────────────

  useEffect(() => {
    const ua = navigator.userAgent
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(ua))
    if (ua.includes('Chrome') && !ua.includes('Edge')) setBrowser('chrome')
    else if (ua.includes('Firefox')) setBrowser('firefox')
    else if (ua.includes('Safari') && !ua.includes('Chrome')) setBrowser('safari')
    else if (ua.includes('Edge')) setBrowser('edge')
    else setBrowser('other')
  }, [])

  // ── Location ──────────────────────────────────────────────────────────────

  const requestLocation = useCallback(() => {
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setLocationError(null)
    setShowAccuracyWarning(false)
    setShowDesktopManualInput(false)

    if (!navigator.geolocation) {
      setLocationState('denied')
      setLocationError(
        isMob
          ? 'Your browser does not support location. Try Chrome or Safari.'
          : 'Your browser does not support location. Please type your area manually below.'
      )
      return
    }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationAccuracy(pos.coords.accuracy)
        setLocationState('success')
        if (!isMob && pos.coords.accuracy > 1000) {
          setShowAccuracyWarning(true)
        }
        setStep('camera')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationState('denied')
        } else if (err.code === err.TIMEOUT) {
          setLocationState('timeout')
        } else {
          setLocationState('denied')
        }
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  // ── Manual location search ────────────────────────────────────────────────

  const handleManualSearch = useCallback(async () => {
    const query = manualInput.trim()
    if (!query) return
    setManualError(null)

    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query + ', Bengaluru' }),
      })
      const data = await res.json() as { found: boolean; lat?: number; lng?: number }

      if (!data.found || data.lat == null || data.lng == null) {
        setManualError('Area not found in Bengaluru. Try a different name.')
        return
      }

      setCoords({ lat: data.lat, lng: data.lng })
      setManualLocation(true)
      setLocationState('success')
      setStep('camera')
    } catch {
      setManualError('Area not found in Bengaluru. Try a different name.')
    }
  }, [manualInput])

  // ── Camera / file ─────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(reader.result as string)
      setStep('preview')
    }
    reader.readAsDataURL(file)
    e.target.value = '' // allow re-selection of the same file
  }, [])

  const openCamera = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // ── Analyse ───────────────────────────────────────────────────────────────

  const analyzeImage = useCallback(async () => {
    if (!imageDataUrl || !coords) return
    setStep('analyzing')
    setAnalyzeError(null)

    try {
      let imageToSend = imageDataUrl
      try {
        imageToSend = await resizeImage(imageDataUrl)
      } catch {
        // resize failed — send original
      }

      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageToSend,
          lat: coords.lat,
          lng: coords.lng,
          manual_location: manualLocation,
        }),
      })

      const raw: Partial<ClassifyResponse> = await res.json().catch(() => ({}))
      setAnalysisResult(normaliseResponse(raw))
      setStep('result')
    } catch {
      setAnalyzeError('Failed to reach the server. Please check your connection and try again.')
      setStep('preview')
    }
  }, [imageDataUrl, coords, manualLocation])

  // ── Fetch nearby reports once classify succeeds ───────────────────────────

  useEffect(() => {
    if (!analysisResult?.is_valid || !coords) {
      setNearbyReports([])
      return
    }
    let cancelled = false
    fetch(`/api/nearby-reports?lat=${coords.lat}&lng=${coords.lng}&radius=200`)
      .then(r => r.json())
      .then((data: { reports?: NearbyReport[] }) => {
        if (!cancelled) setNearbyReports(data.reports ?? [])
      })
      .catch(() => { if (!cancelled) setNearbyReports([]) })
    return () => { cancelled = true }
  }, [analysisResult, coords])

  // ── Persist draft to sessionStorage for /report/email ─────────────────────

  useEffect(() => {
    if (step !== 'result' || !analysisResult?.is_valid || !coords) return

    const locality = analysisResult.location_details?.locality ?? analysisResult.locality_name ?? ''
    const fallback = WARD_CENTERS[locality] ?? WARD_CENTERS[analysisResult.ward_name ?? '']
    const rawLat = coords.lat
    const rawLng = coords.lng
    const finalLat = typeof rawLat === 'number' && !isNaN(rawLat)
      ? rawLat
      : (parseFloat(rawLat as unknown as string) || fallback?.lat || null)
    const finalLng = typeof rawLng === 'number' && !isNaN(rawLng)
      ? rawLng
      : (parseFloat(rawLng as unknown as string) || fallback?.lng || null)

    const draft = {
      issue_type:               analysisResult.issue_type,
      severity:                 analysisResult.severity,
      triage_level:             analysisResult.triage_level,
      triage_label:             analysisResult.triage_label,
      description:              analysisResult.description,
      locality,
      ward_name:                analysisResult.ward_name,
      ward_zone:                analysisResult.ward_zone,
      nearest_landmark:         analysisResult.nearest_landmark,
      pincode:                  analysisResult.location_details?.pincode ?? null,
      lat:                      finalLat,
      lng:                      finalLng,
      cluster_count:            analysisResult.cluster?.cluster_count ?? 0,
      cluster_suggested_action: analysisResult.cluster?.suggested_action ?? null,
      report_hash:              analysisResult.report_hash ?? '',
      manual_location:          manualLocation,
      captured_at:              new Date().toISOString(),
      captured_image_url:       imageDataUrl && imageDataUrl.length < 500000
        ? imageDataUrl
        : null,
    }

    sessionStorage.setItem('nammuru_report_draft', JSON.stringify(draft))
  }, [step, analysisResult, coords, manualLocation, imageDataUrl])

  // ── Reset ─────────────────────────────────────────────────────────────────

  const retake = useCallback(() => {
    setImageDataUrl(null)
    setAnalysisResult(null)
    setAnalyzeError(null)
    setStep('camera')
  }, [])

  const reportAnother = useCallback(() => {
    setImageDataUrl(null)
    setAnalysisResult(null)
    setAnalyzeError(null)
    setStep('camera')
  }, [])

  // ─── Derived ──────────────────────────────────────────────────────────────

  const activePill: 1 | 2 | 3 | 4 =
    step === 'location' || step === 'camera' || step === 'preview' ? 1
    : step === 'analyzing' ? 2
    : 3

  // ─── Render ───────────────────────────────────────────────────────────────

  const navRight = step !== 'location' ? (
    <button
      onClick={retake}
      style={{ background: 'none', border: `1px solid rgba(138,158,150,0.25)`, borderRadius: '9999px', color: TEXT_MUTED, cursor: 'pointer', padding: '0.375rem 0.875rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'DM Sans', sans-serif" }}
    >
      <RotateCcw size={13} /> Start over
    </button>
  ) : undefined

  return (
    <AppShell currentStep={activePill} navRight={navRight}>
      {/* ── STEP: location / idle ──────────────────────────────────── */}
            {step === 'location' && locationState === 'idle' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2.5rem', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.1)', border: `1px solid rgba(15,110,86,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={36} style={{ color: TEAL }} />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Enable Location</h1>
                  <p style={{ color: TEXT_MUTED, maxWidth: '320px', margin: '0 auto', lineHeight: 1.72, fontSize: '0.9rem' }}>
                    {isMobile
                      ? 'We need your GPS location to identify the ward and check for nearby reports.'
                      : 'We need your location to identify the ward. Desktop GPS may be less precise — you can also type your area manually.'}
                  </p>
                </div>
                <button
                  onClick={requestLocation}
                  className="btn-teal-glow"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                >
                  <MapPin size={18} /> Allow Location Access
                </button>
              </div>
            )}

            {/* ── STEP: location / requesting ───────────────────────────── */}
            {step === 'location' && locationState === 'requesting' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2.5rem', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.1)', border: `1px solid rgba(15,110,86,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={36} style={{ color: TEAL }} />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Allow location access</h1>
                  <p style={{ color: TEXT_MUTED, maxWidth: '380px', margin: '0 auto 0.75rem', lineHeight: 1.72, fontSize: '0.9rem' }}>
                    NammuruAI needs your GPS location to route your report to the correct BBMP ward officer and attach verified coordinates to your complaint.
                  </p>
                  <p style={{ color: TEXT_MUTED, fontSize: '0.875rem', fontWeight: 500 }}>
                    When your browser asks, {isMobile ? 'tap' : 'click'}{' '}
                    <span style={{ color: TEAL }}>Allow</span>.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: TEXT_MUTED, fontSize: '0.875rem' }}>
                  <div className="spinner-teal-sm" />
                  Waiting for permission…
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', width: '100%', maxWidth: '380px' }}>
                    <p style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontStyle: 'italic' }}>
                      Testing on desktop? Type your Bengaluru area below to skip GPS.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                        placeholder="e.g. HSR Layout"
                        style={{ flex: 1, background: DARK3, color: TEXT_PRIMARY, border: `1px solid rgba(15,110,86,0.3)`, borderRadius: '0.625rem', padding: '0 0.875rem', minHeight: '40px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => void handleManualSearch()}
                        className="btn-teal-glow"
                        style={{ background: TEAL, color: 'white', borderRadius: '0.625rem', padding: '0 1rem', minHeight: '40px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
                      >
                        Go
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: location / denied ───────────────────────────────── */}
            {step === 'location' && locationState === 'denied' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(229,62,62,0.1)', border: `1px solid rgba(229,62,62,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={28} style={{ color: RED }} />
                  </div>
                  <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.375rem' }}>Location access blocked</h1>
                    <p style={{ color: TEXT_MUTED, fontSize: '0.875rem', maxWidth: '320px', margin: '0 auto' }}>
                      {isMobile
                        ? 'Enable location in your browser settings, then tap Try Again.'
                        : 'Enable location in your browser settings, then click Try Again.'}
                    </p>
                  </div>
                </div>

                {locationError ? (
                  <div style={{ background: 'rgba(229,62,62,0.07)', border: `1px solid rgba(229,62,62,0.25)`, borderLeft: `4px solid ${RED}`, borderRadius: '0.75rem', padding: '1rem', fontSize: '0.875rem', color: '#f87171' }}>
                    {locationError}
                  </div>
                ) : isMobile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { title: 'iPhone', instruction: 'Settings → Safari → Location → Allow' },
                      { title: 'Android', instruction: 'Settings → Apps → Chrome → Permissions → Location → Allow' },
                    ].map(({ title, instruction }) => (
                      <div key={title} style={{ background: DARK3, border: `1px solid rgba(138,158,150,0.15)`, borderRadius: '0.75rem', padding: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{title}</p>
                        <p style={{ fontSize: '0.8125rem', color: TEXT_PRIMARY, lineHeight: 1.6 }}>{instruction}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: DARK3, border: `1px solid rgba(138,158,150,0.15)`, borderLeft: `4px solid rgba(229,62,62,0.4)`, borderRadius: '0.75rem', padding: '1rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>
                      {browser === 'chrome' ? 'Chrome' : browser === 'firefox' ? 'Firefox' : browser === 'safari' ? 'Safari' : browser === 'edge' ? 'Edge' : 'Browser'}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: TEXT_PRIMARY, lineHeight: 1.6 }}>
                      {browser === 'chrome' && 'Click the lock icon 🔒 in your address bar → Site settings → Location → Allow → Refresh this page'}
                      {browser === 'firefox' && 'Click the lock icon in your address bar → Connection secure → More information → Permissions → Access your location → Allow'}
                      {browser === 'safari' && 'Safari menu → Settings for this website → Location → Allow'}
                      {browser === 'edge' && 'Click the lock icon in your address bar → Permissions for this site → Location → Allow'}
                      {browser === 'other' && "Look for a location icon in your browser's address bar and click Allow, then refresh."}
                    </p>
                  </div>
                )}

                {!locationError && (
                  <button
                    onClick={requestLocation}
                    className="btn-teal-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Try Again
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(138,158,150,0.18)' }} />
                  <span style={{ fontSize: '0.875rem', color: TEXT_MUTED }}>— or —</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(138,158,150,0.18)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                      placeholder="Type your area, e.g. HSR Layout"
                      style={{ flex: 1, background: DARK3, color: TEXT_PRIMARY, border: `1px solid rgba(15,110,86,0.3)`, borderRadius: '0.75rem', padding: '0 1rem', minHeight: '52px', fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => void handleManualSearch()}
                      className="btn-teal-glow"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0 1.25rem', borderRadius: '0.75rem', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
                    >
                      <Search size={18} /> Search
                    </button>
                  </div>
                  {manualError && (
                    <p style={{ fontSize: '0.875rem', color: '#f87171' }}>{manualError}</p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: TEXT_MUTED }}>
                    Manual reports are flagged as location-unverified
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP: location / timeout ──────────────────────────────── */}
            {step === 'location' && locationState === 'timeout' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2.5rem', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.1)', border: `1px solid rgba(15,110,86,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner-teal" />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Still getting your location…</h1>
                  <p style={{ color: TEXT_MUTED, maxWidth: '280px', margin: '0 auto', lineHeight: 1.72, fontSize: '0.9rem' }}>
                    This can take a moment outdoors. Please wait.
                  </p>
                </div>
                {showTryAgainButton && (
                  <button
                    onClick={requestLocation}
                    className="btn-teal-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {/* ── STEP: camera ─────────────────────────────────────────── */}
            {step === 'camera' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2rem', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.1)', border: `1px solid rgba(15,110,86,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={36} style={{ color: TEAL }} />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Capture the Issue</h1>
                  <p style={{ color: TEXT_MUTED, maxWidth: '320px', margin: '0 auto', lineHeight: 1.72, fontSize: '0.9rem' }}>
                    Take a clear outdoor photo of the civic problem — a pothole, garbage, broken streetlight, or other issue.
                  </p>
                </div>

                {coords && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                    📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    {manualLocation && (
                      <span style={{ color: AMBER, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>⚠ GPS unverified</span>
                    )}
                  </p>
                )}

                {showAccuracyWarning && (
                  <div style={{ width: '100%', background: 'rgba(217,119,6,0.07)', border: `1px solid rgba(217,119,6,0.3)`, borderLeft: `4px solid ${AMBER}`, borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <AlertTriangle size={16} style={{ color: AMBER, flexShrink: 0, marginTop: '1px' }} />
                      <p style={{ fontSize: '0.875rem', color: '#fcd34d', lineHeight: 1.6 }}>
                        Desktop GPS is imprecise
                        {locationAccuracy !== null ? ` (±${Math.round(locationAccuracy / 1000)}km)` : ''}.
                        Your location may only show your city, not your street — is this correct?
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setManualLocation(true)
                          setShowAccuracyWarning(false)
                        }}
                        className="btn-teal-glow"
                        style={{ flex: 1, borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, color: 'white', background: TEAL, minHeight: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Yes, that&apos;s right
                      </button>
                      <button
                        onClick={() => {
                          setShowAccuracyWarning(false)
                          setShowDesktopManualInput(true)
                        }}
                        style={{ flex: 1, borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, color: TEXT_MUTED, background: DARK3, border: `1px solid rgba(138,158,150,0.25)`, minHeight: '40px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        No, let me type
                      </button>
                    </div>
                  </div>
                )}

                {showDesktopManualInput && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                        placeholder="Type your area, e.g. HSR Layout"
                        style={{ flex: 1, background: DARK3, color: TEXT_PRIMARY, border: `1px solid rgba(15,110,86,0.3)`, borderRadius: '0.75rem', padding: '0 1rem', minHeight: '48px', fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => void handleManualSearch()}
                        className="btn-teal-glow"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.875rem', borderRadius: '0.75rem', fontWeight: 600, color: 'white', background: TEAL, minHeight: '48px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <Search size={16} />
                      </button>
                    </div>
                    {manualError && (
                      <p style={{ fontSize: '0.875rem', color: '#f87171' }}>{manualError}</p>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!isMobile && (
                  <p style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginTop: '0.25rem' }}>
                    Desktop: upload a real photo of the issue taken on-site.
                    Screenshots and stock images will be rejected by AI verification.
                  </p>
                )}

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={openCamera}
                    className="btn-teal-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Camera size={18} /> Take Photo
                  </button>
                  <button
                    onClick={openCamera}
                    className="btn-outline-teal"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: TEAL, background: 'transparent', minHeight: '52px', border: `1px solid ${TEAL}`, cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Upload from Gallery
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: preview ────────────────────────────────────────── */}
            {step === 'preview' && imageDataUrl && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.375rem' }}>Review Photo</h1>
                  <p style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>Make sure the issue is clearly visible.</p>
                </div>

                <div style={{ borderRadius: '0.875rem', overflow: 'hidden', border: `1px solid rgba(15,110,86,0.2)`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="Captured issue"
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }}
                  />
                </div>

                {analyzeError && (
                  <div style={{ background: 'rgba(229,62,62,0.07)', border: `1px solid rgba(229,62,62,0.25)`, borderLeft: `4px solid ${RED}`, borderRadius: '0.75rem', padding: '1rem', fontSize: '0.875rem', color: '#f87171' }}>
                    {analyzeError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                  <button
                    onClick={() => void analyzeImage()}
                    className="btn-teal-glow"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Analyse with AI
                  </button>
                  <button
                    onClick={retake}
                    className="btn-outline-teal"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: TEAL, background: 'transparent', minHeight: '52px', border: `1px solid ${TEAL}`, cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <RotateCcw size={16} /> Retake
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: analyzing ──────────────────────────────────────── */}
            {step === 'analyzing' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2.5rem', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.1)', border: `1px solid rgba(15,110,86,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner-teal" />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.75rem' }}>Analysing…</h1>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {['Validating image', 'Classifying issue', 'Assigning triage'].map((text, i) => (
                      <p key={text} style={{ fontSize: '0.875rem', color: TEXT_MUTED, animation: `fadeInUp 0.4s ease-out ${i * 180}ms both` }}>{text}…</p>
                    ))}
                  </div>
                </div>
                {coords && (
                  <p style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                    📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {/* ── STEP: result ─────────────────────────────────────────── */}
            {step === 'result' && analysisResult && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* ── VALID RESULT ─────────────────────────────────────── */}
                {analysisResult.is_valid && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {analysisResult.private_property_detected && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(217,119,6,0.07)', border: `1px solid rgba(217,119,6,0.3)`, borderLeft: `4px solid ${AMBER}`, borderRadius: '0.75rem', padding: '0.875rem' }}>
                        <AlertTriangle size={15} style={{ color: AMBER, flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '0.8125rem', color: '#fcd34d', lineHeight: 1.65 }}>
                          Possible private property detected in this image. If this is a public road or footpath issue, proceed normally.
                        </p>
                      </div>
                    )}

                    {analysisResult.triage_level && (
                      <div>
                        <div style={{
                          background: triageConfig(analysisResult.triage_level).color,
                          color: 'white',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          fontSize: '0.875rem',
                          padding: '0.875rem 1rem',
                          borderRadius: '0.875rem',
                          textAlign: 'center',
                          letterSpacing: '0.1em',
                        }}>
                          {triageConfig(analysisResult.triage_level).text}
                        </div>
                        {analysisResult.triage_reason && (
                          <p style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginTop: '0.5rem', textAlign: 'center' }}>
                            {analysisResult.triage_reason}
                          </p>
                        )}
                      </div>
                    )}

                    {analysisResult.cluster?.is_cluster && (
                      <div style={{ background: 'rgba(212,168,67,0.07)', border: `1px solid rgba(212,168,67,0.35)`, borderLeft: `4px solid ${GOLD}`, borderRadius: '0.875rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <Users size={18} style={{ color: GOLD, flexShrink: 0, marginTop: '1px' }} />
                          <div>
                            <p style={{ fontWeight: 600, color: GOLD, fontSize: '0.875rem' }}>
                              {analysisResult.cluster.cluster_count} reports at this location in the last 7 days
                            </p>
                            {analysisResult.cluster.suggested_action && (
                              <p style={{ color: '#fbbf24', fontSize: '0.875rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                {analysisResult.cluster.suggested_action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {analysisResult.cluster && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: TEXT_MUTED }}>
                        <Users size={14} style={{ flexShrink: 0 }} />
                        {analysisResult.cluster.cluster_count === 0
                          ? 'First report at this location'
                          : `${analysisResult.cluster.cluster_count} other report${analysisResult.cluster.cluster_count === 1 ? '' : 's'} near this location this week`}
                      </div>
                    )}

                    {/* Issue card */}
                    <div style={{ background: DARK2, border: `1px solid rgba(15,110,86,0.2)`, borderLeft: `4px solid ${TEAL}`, borderRadius: '0.875rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={18} style={{ color: TEAL }} />
                          <span style={{ fontWeight: 600, color: TEXT_PRIMARY, fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>
                            {analysisResult.issue_type ?? 'Civic Issue'}
                          </span>
                        </div>
                        {analysisResult.severity && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.75rem', borderRadius: '9999px',
                            background: `${severityColor(analysisResult.severity)}1a`,
                            color: severityColor(analysisResult.severity),
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {analysisResult.severity}
                          </span>
                        )}
                      </div>

                      {/* Location block */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <LocationBlock
                          locality={analysisResult.location_details?.locality ?? analysisResult.locality_name ?? 'Bengaluru'}
                          road={analysisResult.location_details?.road ?? undefined}
                          pincode={analysisResult.location_details?.pincode ?? undefined}
                          landmark={analysisResult.jurisdiction_flag?.nearest_landmark ?? undefined}
                          wardName={
                            analysisResult.ward_name
                              ? analysisResult.ward_is_fallback ? 'BBMP Grievance Cell' : analysisResult.ward_name
                              : undefined
                          }
                          zone={analysisResult.ward_is_fallback ? undefined : analysisResult.ward_zone ?? undefined}
                        />
                        {analysisResult.location_verified === false && (
                          <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 500, background: 'rgba(217,119,6,0.12)', color: AMBER, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                            ⚠ GPS unverified
                          </span>
                        )}
                      </div>

                      <div style={{ height: '1px', background: 'rgba(138,158,150,0.12)' }} />

                      {analysisResult.description && (
                        <div>
                          <p style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.375rem' }}>AI Observation</p>
                          <p style={{ fontSize: '0.875rem', color: TEXT_PRIMARY, fontStyle: 'italic', lineHeight: 1.72 }}>{analysisResult.description}</p>
                        </div>
                      )}

                      {analysisResult.confidence !== null && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>AI Confidence</span>
                            <span style={{ fontSize: '0.75rem', color: TEXT_PRIMARY, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(analysisResult.confidence * 100)}%</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(138,158,150,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: TEAL, borderRadius: '2px', width: `${Math.round(analysisResult.confidence * 100)}%`, transition: 'width 1s ease-out' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {imageDataUrl && (
                      <div style={{ borderRadius: '0.875rem', overflow: 'hidden', border: `1px solid rgba(15,110,86,0.18)`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageDataUrl} alt="Issue photo" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                      </div>
                    )}

                    {coords && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#8a9e96',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 8,
                        }}>
                          YOUR LOCATION
                        </div>
                        <MiniMap
                          lat={coords.lat}
                          lng={coords.lng}
                          wardName={analysisResult.ward_name ?? undefined}
                          nearbyReports={nearbyReports}
                          zoom={15}
                          height="200px"
                        />
                        {nearbyReports.length > 0 && (
                          <p style={{
                            color: GOLD,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            marginTop: 8,
                          }}>
                            <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {nearbyReports.length} reports within 200m in the last 30 days
                          </p>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <Link
                        href="/report/email"
                        className="btn-teal-glow"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
                      >
                        Compose Letter to BBMP →
                      </Link>
                      <button
                        onClick={reportAnother}
                        className="btn-outline-teal"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: TEAL, background: 'transparent', minHeight: '52px', border: `1px solid ${TEAL}`, cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Report Another Issue
                      </button>
                    </div>
                  </div>
                )}

                {/* ── INVALID RESULT ───────────────────────────────────── */}
                {!analysisResult.is_valid && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: DARK2, border: `1px solid rgba(229,62,62,0.2)`, borderLeft: `6px solid ${RED}`, borderRadius: '0.875rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <XCircle size={20} style={{ color: RED, flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: RED, marginBottom: '0.375rem' }}>Report Rejected</h2>
                          <p style={{ color: TEXT_PRIMARY, fontSize: '0.875rem', lineHeight: 1.65 }}>
                            {analysisResult.user_message}
                          </p>
                        </div>
                      </div>
                      {analysisResult.rejection_reason && (
                        <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 500, padding: '0.2rem 0.75rem', borderRadius: '9999px', background: 'rgba(229,62,62,0.1)', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>
                          {analysisResult.rejection_reason.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {imageDataUrl && (
                      <div style={{ borderRadius: '0.875rem', overflow: 'hidden', border: `1px solid rgba(229,62,62,0.18)`, opacity: 0.6 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageDataUrl} alt="Rejected photo" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#000' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <button
                        onClick={retake}
                        className="btn-teal-glow"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <Camera size={18} /> Try a Different Photo
                      </button>
                      <Link
                        href="/"
                        className="btn-outline-teal"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', fontWeight: 600, color: TEAL, background: 'transparent', minHeight: '52px', border: `1px solid ${TEAL}`, cursor: 'pointer', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
                      >
                        Back to Home
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

    </AppShell>
  )
}
