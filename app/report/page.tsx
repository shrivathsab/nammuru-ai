'use client'

import { useRef, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { resizeImage } from '@/lib/imageResize'
import type { ClassifyResponse } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'location' | 'camera' | 'preview' | 'analyzing' | 'result'

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
  return {
    is_valid:         raw.is_valid         ?? false,
    user_message:     raw.user_message     ?? 'Something went wrong. Please try again.',
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
    private_property_detected: raw.private_property_detected ?? false,
    jurisdiction_flag:         raw.jurisdiction_flag         ?? null,
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
  const [step, setStep]                   = useState<Step>('location')
  const [coords, setCoords]               = useState<Coords | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl]   = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<ClassifyResponse | null>(null)
  const [analyzeError, setAnalyzeError]   = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Location ──────────────────────────────────────────────────────────────

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocationLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
        setStep('camera')
      },
      (err) => {
        setLocationLoading(false)
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Please enable it in your browser settings and try again.'
            : 'Unable to get your location. Please try again.',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  // ── Camera / file ─────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
        body: JSON.stringify({ image_base64: imageToSend, lat: coords.lat, lng: coords.lng }),
      })

      const raw: Partial<ClassifyResponse> = await res.json().catch(() => ({}))
      setAnalysisResult(normaliseResponse(raw))
      setStep('result')
    } catch {
      setAnalyzeError('Failed to reach the server. Please check your connection and try again.')
      setStep('preview')
    }
  }, [imageDataUrl, coords])

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

          {/* ── STEP: location ─────────────────────────────────────────────── */}
          {step === 'location' && (
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
                  We need your GPS location to identify the ward and check for nearby reports.
                </p>
              </div>

              {locationError && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-left">
                  {locationError}
                </div>
              )}

              <button
                onClick={requestLocation}
                disabled={locationLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-60"
                style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
              >
                {locationLoading
                  ? <><Loader2 size={18} className="animate-spin" /> Getting location…</>
                  : <><MapPin size={18} /> Allow Location Access</>}
              </button>
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
                <p className="text-xs text-gray-400">
                  📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
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

              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={analyzeImage}
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
                      {/* Row 1: Primary location */}
                      <div className="flex items-center text-sm font-medium text-gray-700" style={{ gap: '4px' }}>
                        <MapPin size={14} className="flex-shrink-0" style={{ color: '#0F6E56' }} />
                        <span>
                          {analysisResult.location_details?.locality ?? analysisResult.locality_name ?? 'Bengaluru'}, Bengaluru
                        </span>
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
                    <button
                      className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
                      style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
                    >
                      Submit Report
                    </button>
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
