'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Camera,
  MapPin,
  Navigation,
  Landmark,
  Building2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  Users,
  Search,
} from 'lucide-react'
import ExifReader from 'exifreader'
import { resizeImage } from '@/lib/imageResize'
import type { ClassifyResponse } from '@/lib/types'

async function hasValidCameraExif(file: File): Promise<boolean> {
  try {
    const tags = await ExifReader.load(file)
    const hasGPS = !!(tags['GPSLatitude'] && tags['GPSLongitude'])
    const hasCameraMake = !!tags['Make']?.description
    return hasGPS || hasCameraMake
  } catch {
    return true
  }
}

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

function triageConfig(level: 1 | 2 | 3): { bg: string; text: string } {
  if (level === 1) return { bg: 'bg-red-600',   text: 'URGENT — Fix within 48 hours' }
  if (level === 2) return { bg: 'bg-amber-500', text: 'MEDIUM — Fix within 1 week' }
  return            { bg: 'bg-green-600',  text: 'ROUTINE — Add to maintenance schedule' }
}

function severityClasses(severity: string): string {
  if (severity === 'high')   return 'bg-red-100 text-red-700'
  if (severity === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < current ? 'bg-[#0F6E56]' : i === current - 1 ? 'bg-[#0F6E56]' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
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
  const [exifWarning, setExifWarning]               = useState(false)

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

    const looksLikeRealPhoto = await hasValidCameraExif(file)
    setExifWarning(!looksLikeRealPhoto)

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

  // ── Persist draft to sessionStorage for /report/email ─────────────────────

  useEffect(() => {
    if (step !== 'result' || !analysisResult?.is_valid || !coords) return

    const draft = {
      issue_type:               analysisResult.issue_type,
      severity:                 analysisResult.severity,
      triage_level:             analysisResult.triage_level,
      triage_label:             analysisResult.triage_label,
      description:              analysisResult.description,
      locality:                 analysisResult.location_details?.locality ?? analysisResult.locality_name ?? '',
      ward_name:                analysisResult.ward_name,
      ward_zone:                analysisResult.ward_zone,
      nearest_landmark:         analysisResult.nearest_landmark,
      pincode:                  analysisResult.location_details?.pincode ?? null,
      lat:                      coords.lat,
      lng:                      coords.lng,
      cluster_count:            analysisResult.cluster?.cluster_count ?? 0,
      cluster_suggested_action: analysisResult.cluster?.suggested_action ?? null,
      report_hash:              analysisResult.report_hash ?? '',
      manual_location:          manualLocation,
      captured_at:              new Date().toISOString(),
    }

    sessionStorage.setItem('nammuru_report_draft', JSON.stringify(draft))
  }, [step, analysisResult, coords, manualLocation])

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

  // ─── Render ───────────────────────────────────────────────────────────────

  const stepIndex = { location: 1, camera: 2, preview: 3, analyzing: 4, result: 5 }[step]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold" style={{ color: '#0F6E56' }}>NammuruAI</span>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              ನಮ್ಮ ಊರಿಗಾಗಿ AI — Civic accountability for Bengaluru
            </p>
          </Link>
          {step !== 'location' && (
            <button
              onClick={retake}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw size={14} /> Start over
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col flex-1">

          <StepHeader current={stepIndex} total={5} />

          {/* ── STEP: location / idle ──────────────────────────────────────── */}
          {step === 'location' && locationState === 'idle' && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <MapPin size={36} style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Enable Location</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                  {isMobile
                    ? 'We need your GPS location to identify the ward and check for nearby reports.'
                    : 'We need your location to identify the ward. Desktop GPS may be less precise — you can also type your area manually.'}
                </p>
              </div>
              <button
                onClick={requestLocation}
                className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
              >
                <MapPin size={18} /> Allow Location Access
              </button>
            </div>
          )}

          {/* ── STEP: location / requesting (priming screen) ───────────────── */}
          {step === 'location' && locationState === 'requesting' && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <MapPin size={36} style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Allow location access</h1>
                <p className="text-gray-600 max-w-sm mx-auto mb-3">
                  NammuruAI needs your GPS location to route your report to the correct BBMP ward
                  officer and attach verified coordinates to your complaint.
                </p>
                <p className="text-sm font-semibold text-gray-500">
                  When your browser asks, {isMobile ? 'tap' : 'click'}{' '}
                  <span style={{ color: '#0F6E56' }}>Allow</span>.
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Waiting for permission…
              </div>
              {!isMobile && (
                <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                  <p className="text-xs text-gray-400">
                    Testing on desktop? Type your Bengaluru area below to skip GPS.
                  </p>
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                      placeholder="e.g. HSR Layout"
                      className="flex-1 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0F6E56]"
                      style={{ minHeight: '40px' }}
                    />
                    <button
                      onClick={() => void handleManualSearch()}
                      className="px-4 rounded-lg text-sm font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: '#0F6E56', minHeight: '40px' }}
                    >
                      Go
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: location / denied ────────────────────────────────────── */}
          {step === 'location' && locationState === 'denied' && (
            <div className="flex flex-col flex-1 gap-5 pt-2">
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={30} className="text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Location access blocked</h1>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    {isMobile
                      ? 'Enable location in your browser settings, then tap Try Again.'
                      : 'Enable location in your browser settings, then click Try Again.'}
                  </p>
                </div>
              </div>

              {/* Platform / browser instructions */}
              {locationError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {locationError}
                </div>
              ) : isMobile ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">iPhone</p>
                    <p className="text-sm text-gray-700 leading-snug">
                      Settings → Safari → Location → Allow
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Android</p>
                    <p className="text-sm text-gray-700 leading-snug">
                      Settings → Apps → Chrome → Permissions → Location → Allow
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    {browser === 'chrome' ? 'Chrome' : browser === 'firefox' ? 'Firefox' : browser === 'safari' ? 'Safari' : browser === 'edge' ? 'Edge' : 'Browser'}
                  </p>
                  <p className="text-sm text-gray-700 leading-snug">
                    {browser === 'chrome' && 'Click the lock icon 🔒 in your address bar → Site settings → Location → Allow → Refresh this page'}
                    {browser === 'firefox' && 'Click the lock icon in your address bar → Connection secure → More information → Permissions → Access your location → Allow'}
                    {browser === 'safari' && 'Safari menu → Settings for this website → Location → Allow'}
                    {browser === 'edge' && 'Click the lock icon in your address bar → Permissions for this site → Location → Allow'}
                    {browser === 'other' && "Look for a location icon in your browser's address bar and click Allow, then refresh."}
                  </p>
                </div>
              )}

              {/* Try Again — hidden when geolocation is unsupported since retrying won't help */}
              {!locationError && (
                <button
                  onClick={requestLocation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                  style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                >
                  Try Again
                </button>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm text-gray-400">— or —</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Manual input */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                    placeholder="Type your area, e.g. HSR Layout"
                    className="flex-1 border border-gray-300 rounded-xl px-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                    style={{ minHeight: '52px' }}
                  />
                  <button
                    onClick={() => void handleManualSearch()}
                    className="flex items-center justify-center gap-1.5 px-5 rounded-xl font-semibold text-white text-base flex-shrink-0"
                    style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>
                {manualError && (
                  <p className="text-sm text-red-600">{manualError}</p>
                )}
                <p className="text-xs text-gray-400">
                  Manual reports are flagged as location-unverified
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: location / timeout ───────────────────────────────────── */}
          {step === 'location' && locationState === 'timeout' && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <Loader2 size={36} className="animate-spin" style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Still getting your location…</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                  This can take a moment outdoors. Please wait.
                </p>
              </div>
              {showTryAgainButton && (
                <button
                  onClick={requestLocation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                  style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* ── STEP: camera ───────────────────────────────────────────────── */}
          {step === 'camera' && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <Camera size={36} style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Capture the Issue</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                  Take a clear outdoor photo of the civic problem — a pothole, garbage, broken streetlight, or other issue.
                </p>
              </div>

              {coords && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  {manualLocation && (
                    <span className="text-amber-500 font-medium">⚠ GPS unverified</span>
                  )}
                </p>
              )}

              {/* Desktop GPS accuracy warning (ADDITION 3) */}
              {showAccuracyWarning && (
                <div className="w-full bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Desktop GPS is imprecise
                      {locationAccuracy !== null ? ` (±${Math.round(locationAccuracy / 1000)}km)` : ''}.
                      Your location may only show your city, not your street — is this correct?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setManualLocation(true)
                        setShowAccuracyWarning(false)
                      }}
                      className="flex-1 rounded-lg text-sm font-semibold text-white py-2"
                      style={{ backgroundColor: '#0F6E56' }}
                    >
                      Yes, that's right
                    </button>
                    <button
                      onClick={() => {
                        setShowAccuracyWarning(false)
                        setShowDesktopManualInput(true)
                      }}
                      className="flex-1 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 bg-white py-2"
                    >
                      No, let me type
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop manual input after accuracy warning rejection */}
              {showDesktopManualInput && (
                <div className="w-full flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch() }}
                      placeholder="Type your area, e.g. HSR Layout"
                      className="flex-1 border border-gray-300 rounded-xl px-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                      style={{ minHeight: '48px' }}
                    />
                    <button
                      onClick={() => void handleManualSearch()}
                      className="flex items-center justify-center px-4 rounded-xl font-semibold text-white text-sm flex-shrink-0"
                      style={{ backgroundColor: '#0F6E56', minHeight: '48px' }}
                    >
                      <Search size={16} />
                    </button>
                  </div>
                  {manualError && (
                    <p className="text-sm text-red-600">{manualError}</p>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={openCamera}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                  style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                >
                  <Camera size={18} /> Take Photo
                </button>
                <button
                  onClick={openCamera}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-gray-700 text-base border border-gray-300 bg-white"
                  style={{ minHeight: '52px' }}
                >
                  Upload from Gallery
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: preview ──────────────────────────────────────────────── */}
          {step === 'preview' && imageDataUrl && (
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Photo</h1>
                <p className="text-gray-500 text-sm">Make sure the issue is clearly visible.</p>
              </div>

              <div className="rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Captured issue"
                  className="w-full max-h-80 object-contain"
                />
              </div>

              {analyzeError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {analyzeError}
                </div>
              )}

              {exifWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-amber-600 text-sm flex-1">
                    This image doesn't appear to be taken directly from a camera.
                    If you're testing on desktop, dismiss and continue.
                    For real reports, please use your phone camera to photograph the issue.
                  </span>
                  <button
                    onClick={() => setExifWarning(false)}
                    className="text-amber-400 hover:text-amber-600 text-xs shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={() => void analyzeImage()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                  style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                >
                  Analyse with AI
                </button>
                <button
                  onClick={retake}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-gray-700 text-base border border-gray-300 bg-white"
                  style={{ minHeight: '52px' }}
                >
                  <RotateCcw size={16} /> Retake
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: analyzing ────────────────────────────────────────────── */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <Loader2 size={36} className="animate-spin" style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysing…</h1>
                <p className="text-gray-500">
                  AI is classifying the issue, detecting severity, and checking for nearby reports.
                </p>
              </div>
              {coords && (
                <p className="text-xs text-gray-400">
                  📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}

          {/* ── STEP: result ───────────────────────────────────────────────── */}
          {step === 'result' && analysisResult && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {analysisResult.is_valid ? 'Issue Detected' : 'Not Accepted'}
                </h1>
                <p className="text-gray-500 text-sm">
                  {analysisResult.is_valid
                    ? 'Review the details below before submitting.'
                    : 'Your photo could not be classified as a civic issue.'}
                </p>
              </div>

              {/* ── VALID RESULT ─────────────────────────────────────────── */}
              {analysisResult.is_valid && (
                <div className="flex flex-col gap-4">

                  {/* Private property warning */}
                  {analysisResult.private_property_detected && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl p-2">
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Possible private property detected in this image. If this is a public road or footpath issue, proceed normally.
                      </p>
                    </div>
                  )}

                  {/* Triage badge */}
                  {analysisResult.triage_level && (
                    <div>
                      <div
                        className={`${triageConfig(analysisResult.triage_level).bg} text-white font-mono font-bold uppercase text-sm px-4 py-3.5 rounded-xl text-center tracking-widest`}
                      >
                        {triageConfig(analysisResult.triage_level).text}
                      </div>
                      {analysisResult.triage_reason && (
                        <p className="text-xs text-gray-500 mt-1.5 text-center">
                          {analysisResult.triage_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cluster alert */}
                  {analysisResult.cluster?.is_cluster && (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-800 text-sm">
                            {analysisResult.cluster.cluster_count} reports at this location in the last 7 days
                          </p>
                          {analysisResult.cluster.suggested_action && (
                            <p className="text-amber-700 text-sm italic mt-1">
                              {analysisResult.cluster.suggested_action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cluster count (always visible) */}
                  {analysisResult.cluster && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users size={14} className="flex-shrink-0" />
                      {analysisResult.cluster.cluster_count === 0
                        ? 'First report at this location'
                        : `${analysisResult.cluster.cluster_count} other report${analysisResult.cluster.cluster_count === 1 ? '' : 's'} near this location this week`}
                    </div>
                  )}

                  {/* Issue card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={18} style={{ color: '#0F6E56' }} />
                        <span className="font-semibold text-gray-900">
                          {analysisResult.issue_type ?? 'Civic Issue'}
                        </span>
                      </div>
                      {analysisResult.severity && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${severityClasses(analysisResult.severity)}`}
                        >
                          {analysisResult.severity}
                        </span>
                      )}
                    </div>

                    {/* Location block */}
                    <div className="flex flex-col" style={{ gap: '3px' }}>
                      {/* Row 1: Primary location + optional GPS-unverified badge */}
                      <div className="flex items-center flex-wrap gap-1.5 text-sm font-medium text-gray-700">
                        <MapPin size={14} className="flex-shrink-0" style={{ color: '#0F6E56' }} />
                        <span>
                          {analysisResult.location_details?.locality ?? analysisResult.locality_name ?? 'Bengaluru'}, Bengaluru
                        </span>
                        {analysisResult.location_verified === false && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⚠ GPS unverified
                          </span>
                        )}
                      </div>

                      {/* Row 2: Road and pincode */}
                      {(analysisResult.location_details?.road ?? analysisResult.location_details?.pincode) && (
                        <div className="flex items-center text-xs text-gray-400" style={{ gap: '4px' }}>
                          <Navigation size={12} className="flex-shrink-0" style={{ color: '#9ca3af' }} />
                          <span>
                            {[
                              analysisResult.location_details.road,
                              analysisResult.location_details.pincode
                                ? `· PIN ${analysisResult.location_details.pincode}`
                                : null,
                            ].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      )}

                      {/* Row 3: Nearest landmark */}
                      {analysisResult.jurisdiction_flag?.nearest_landmark && (
                        <div className="flex items-center text-xs text-gray-400" style={{ gap: '4px' }}>
                          <Landmark size={12} className="flex-shrink-0" style={{ color: '#9ca3af' }} />
                          <span>Near {analysisResult.jurisdiction_flag.nearest_landmark}</span>
                        </div>
                      )}

                      {/* Row 4: Ward and zone */}
                      {analysisResult.ward_name && (
                        <div className="flex items-center text-xs text-gray-400" style={{ gap: '4px' }}>
                          <Building2 size={12} className="flex-shrink-0" style={{ color: '#9ca3af' }} />
                          <span>
                            {analysisResult.ward_is_fallback
                              ? 'BBMP Grievance Cell'
                              : `${analysisResult.ward_name}${analysisResult.ward_zone ? ` · ${analysisResult.ward_zone} Zone` : ''}`
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-b border-gray-100" />

                    {analysisResult.description && (
                      <p className="text-sm text-gray-600">{analysisResult.description}</p>
                    )}

                    {analysisResult.confidence !== null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.round(analysisResult.confidence * 100)}%`,
                              backgroundColor: '#0F6E56',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {Math.round(analysisResult.confidence * 100)}% confidence
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Preview thumbnail */}
                  {imageDataUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageDataUrl}
                        alt="Issue photo"
                        className="w-full max-h-52 object-contain"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3 mt-2">
                    <Link
                      href="/report/email"
                      className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                      style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                    >
                      Submit Report
                    </Link>
                    <button
                      onClick={reportAnother}
                      className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-gray-700 text-base border border-gray-300 bg-white"
                      style={{ minHeight: '52px' }}
                    >
                      Report Another Issue
                    </button>
                  </div>
                </div>
              )}

              {/* ── INVALID RESULT ───────────────────────────────────────── */}
              {!analysisResult.is_valid && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {analysisResult.user_message}
                      </p>
                    </div>
                    {analysisResult.rejection_reason && (
                      <span className="self-start text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                        {analysisResult.rejection_reason.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {imageDataUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 opacity-60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageDataUrl}
                        alt="Rejected photo"
                        className="w-full max-h-48 object-contain bg-black"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={retake}
                      className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                      style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                    >
                      <Camera size={18} /> Try a Different Photo
                    </button>
                    <Link
                      href="/"
                      className="w-full flex items-center justify-center rounded-xl font-semibold text-gray-700 text-base border border-gray-300 bg-white"
                      style={{ minHeight: '52px' }}
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
