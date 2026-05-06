'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  RotateCcw,
  AlertTriangle,
  Mail,
  Users,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

import { resizeImage } from '@/lib/imageResize'
import { tokens } from '@/lib/design-tokens'
import type {
  ClassifyResponse,
  DraftContentResponse,
  PublicReport,
} from '@/lib/types'
import MiniMap from '@/components/MiniMap'
import ClusterBanner from '@/components/ClusterBanner'
import LocationPermissionCard, {
  ManualLocationCard,
  type LocationCardState,
} from '@/components/LocationPermissionCard'

type LocationState = LocationCardState | 'loading' | 'granted'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'capturing'
  | 'classifying'
  | 'duplicate_block'
  | 'rejected'
  | 'ready'
  | 'submitting'
  | 'submitted'

type SeverityChoice = 'low' | 'med' | 'high' | 'critical'

interface Coords {
  lat: number
  lng: number
}

interface NearbyReportLite {
  id: string
  lat: number
  lng: number
  triage_level: number | null
  status?: string
  issue_type?: string | null
  ward_name?: string | null
  created_at: string
  escalation_level?: number | null
}

// ─── Tokens (inline-style aliases) ────────────────────────────────────────────

const TEAL = tokens.colors.teal
const DARK = tokens.colors.dark
const DARK2 = tokens.colors.dark2
const DARK3 = tokens.colors.dark3
const GOLD = tokens.colors.gold
const RED = tokens.colors.red
const AMBER = tokens.colors.amber
const TEXT_PRIMARY = tokens.colors.textPrimary
const TEXT_MUTED = tokens.colors.textMuted

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSeverity(s: 'low' | 'medium' | 'high' | null | string | undefined): SeverityChoice {
  if (s === 'high') return 'high'
  if (s === 'low') return 'low'
  return 'med'
}

function severityToWord(s: SeverityChoice): 'low' | 'medium' | 'high' {
  if (s === 'low') return 'low'
  if (s === 'high' || s === 'critical') return 'high'
  return 'medium'
}

function generateReportId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `NMR-${date}-${rand}`
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)

async function uploadReportImage(
  base64DataUrl: string,
  reportHash: string,
): Promise<string | null> {
  try {
    const res = await fetch(base64DataUrl)
    const blob = await res.blob()
    const fileName = `reports/${reportHash.slice(0, 16)}.webp`
    const { error } = await supabaseClient.storage
      .from('report-images')
      .upload(fileName, blob, { contentType: 'image/webp', upsert: true })
    if (error) return null
    const { data } = supabaseClient.storage
      .from('report-images')
      .getPublicUrl(fileName)
    return data.publicUrl
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [classify, setClassify] = useState<ClassifyResponse | null>(null)
  const [draft, setDraft] = useState<DraftContentResponse | null>(null)
  const [severity, setSeverity] = useState<SeverityChoice>('med')
  const [landmark, setLandmark] = useState('')
  const [autoDispatch, setAutoDispatch] = useState(false)
  const [citizenEmail, setCitizenEmail] = useState('')
  const [letterExpanded, setLetterExpanded] = useState(false)
  const [nearbyReports, setNearbyReports] = useState<NearbyReportLite[]>([])
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [toast, setToast] = useState<string | null>(null)

  // Track filing duration for receipt page
  useEffect(() => {
    sessionStorage.setItem('file_started_at', String(Date.now()))
  }, [])

  // Acquire location quietly on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('unavailable')
      return
    }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationState('granted')
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      err => {
        if (err.code === 1) setLocationState('denied')
        else setLocationState('unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  const retryLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState('unavailable')
      return
    }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationState('granted')
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      err => {
        if (err.code === 1) setLocationState('denied')
        else setLocationState('unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── Handle photo capture ──────────────────────────────────────────────────

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!coords) {
      showToast('Waiting for location — please allow access and try again.')
      return
    }

    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    setImageBase64(dataUrl)
    setPhase('classifying')

    let imageToSend = dataUrl
    try {
      imageToSend = await resizeImage(dataUrl)
    } catch {
      // send original
    }

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageToSend,
          lat: coords.lat,
          lng: coords.lng,
          manual_location: false,
        }),
      })
      const result = (await res.json()) as ClassifyResponse

      // Identical duplicate — dead-end
      if (result.duplicate_type === 'identical' && result.duplicate_of) {
        setClassify(result)
        setPhase('duplicate_block')
        return
      }

      if (!result.is_valid) {
        setClassify(result)
        setPhase('rejected')
        return
      }

      setClassify(result)
      setSeverity(mapSeverity(result.severity))
      setPhase('ready')

      // Fire draft-content in parallel — don't block UI
      void fetch('/api/draft-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_type: result.issue_type,
          severity: result.severity,
          triage_level: result.triage_level,
          triage_label: result.triage_label,
          ward_name: result.ward_name,
          ward_zone: result.ward_zone,
          locality: result.locality_name,
          lat: coords.lat,
          lng: coords.lng,
          description: result.description,
          nearest_landmark: result.nearest_landmark,
          pincode: result.location_details?.pincode ?? null,
          cluster_count: result.cluster?.cluster_count ?? 0,
          cluster_suggested_action: result.cluster?.suggested_action ?? null,
          report_hash: result.report_hash,
        }),
      })
        .then(r => r.json())
        .then((d: DraftContentResponse) => setDraft(d))
        .catch(() => {/* leave draft null; submit button stays disabled */})

      void fetch(`/api/nearby-reports?lat=${coords.lat}&lng=${coords.lng}&radius=200`)
        .then(r => r.json())
        .then((d: { reports?: NearbyReportLite[] }) => setNearbyReports(d.reports ?? []))
        .catch(() => setNearbyReports([]))
    } catch {
      showToast('Could not reach the server. Try again.')
      setPhase('idle')
      setImageBase64(null)
    }
  }, [coords])

  const resetAll = useCallback(() => {
    setImageBase64(null)
    setClassify(null)
    setDraft(null)
    setLandmark('')
    setLetterExpanded(false)
    setNearbyReports([])
    setPhase('idle')
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!classify || !draft || !imageBase64 || !coords) return
    setPhase('submitting')

    const reportIdHuman = generateReportId()
    const reportHash = classify.report_hash ?? await sha256Hex(`${imageBase64}:${coords.lat}:${coords.lng}`)
    const imageUrl = await uploadReportImage(imageBase64, reportHash)

    const submitBody = {
      lat: coords.lat,
      lng: coords.lng,
      ward_name: classify.ward_name,
      ward_zone: classify.ward_zone ?? null,
      issue_type: classify.issue_type,
      severity: severityToWord(severity),
      description: classify.description,
      report_hash: reportHash,
      report_id_human: reportIdHuman,
      triage_level: classify.triage_level,
      cluster_count: classify.cluster?.cluster_count ?? 1,
      status: 'open',
      locality_name: classify.locality_name,
      pincode: classify.location_details?.pincode ?? null,
      nearest_landmark: landmark || classify.nearest_landmark || null,
      manual_location: false,
      user_confirmed_public: true,
      image_url: imageUrl,
      image_phash: classify.image_phash,
      citizen_email: autoDispatch ? citizenEmail : null,
      auto_dispatch: autoDispatch,
      officer_token: draft.officer_token,
      email_subject: draft.subject,
      email_draft: draft.body,
      email_recipient: draft.recipient_email,
      tweet_primary: draft.tweet?.primary ?? null,
      tweet_reply_evidence: draft.tweet?.reply_evidence ?? null,
      tweet_reply_escalation: draft.tweet?.reply_escalation ?? null,
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitBody),
      })
      if (res.ok) {
        setPhase('submitted')
        router.push(`/report/${reportIdHuman}/receipt`)
      } else {
        showToast('Submit failed — your draft is safe in this session.')
        setPhase('ready')
      }
    } catch {
      showToast('Submit failed — your draft is safe in this session.')
      setPhase('ready')
    }
  }, [classify, draft, imageBase64, coords, severity, landmark, autoDispatch, citizenEmail, router])

  const submitEnabled = phase === 'ready' && draft !== null && (!autoDispatch || /\S+@\S+\.\S+/.test(citizenEmail))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{
      background: DARK,
      minHeight: '100vh',
      paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
      color: TEXT_PRIMARY,
      fontFamily: tokens.fonts.sans,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes scanline {
          0%, 100% { transform: translateY(-100%); opacity: 0.6; }
          50%      { transform: translateY(100%); opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .section { animation: fadeIn 0.32s ease-out both; }
        .scan-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(15,110,86,0.45) 50%, transparent 100%);
          animation: scanline 2s ease-in-out infinite;
          pointer-events: none;
        }
        input[type="email"], input[type="text"] {
          width: 100%; background: ${DARK3}; color: ${TEXT_PRIMARY};
          border: 1px solid rgba(138,158,150,0.2); border-radius: 10px;
          padding: 0.75rem 0.875rem; font-size: 0.95rem;
          font-family: ${tokens.fonts.sans};
        }
        input:focus { outline: none; border-color: ${TEAL}; }
        button { font-family: ${tokens.fonts.sans}; }
      `}</style>

      {/* Sticky header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(8,15,12,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(138,158,150,0.12)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/" aria-label="Back" style={{ color: TEXT_MUTED, display: 'inline-flex' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{
          margin: 0, fontFamily: tokens.fonts.serif, fontWeight: 700,
          fontSize: '1.05rem', color: TEXT_PRIMARY,
        }}>
          File Report
        </h1>
      </header>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '12px 16px' }}>
        {phase === 'idle' && locationState !== 'granted' && locationState !== 'manual' && (
          <LocationPermissionCard
            state={locationState === 'loading' ? 'requesting' : locationState}
            onRetry={retryLocation}
            onManual={() => setLocationState('manual')}
          />
        )}

        {phase === 'idle' && locationState === 'manual' && !coords && (
          <ManualLocationCard
            onWardSelect={(_ward, lat, lng) => {
              setCoords({ lat, lng })
              setLocationState('granted')
            }}
          />
        )}

        <PhotoCard
          imageBase64={imageBase64}
          phase={phase}
          fileInputRef={fileInputRef}
          onCapture={handleCapture}
          onRetake={resetAll}
        />

        {phase === 'rejected' && classify && (
          <div className="section" style={{
            marginTop: 14, padding: 16, borderRadius: 14,
            background: DARK2, border: '1px solid rgba(229,62,62,0.25)',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={20} style={{ color: RED, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: TEXT_PRIMARY }}>Image not accepted</div>
                <div style={{ color: TEXT_MUTED, fontSize: '0.9rem', marginTop: 4 }}>
                  {classify.user_message}
                </div>
              </div>
            </div>
            <button
              onClick={resetAll}
              style={{
                marginTop: 14, width: '100%', minHeight: 44,
                background: 'transparent', color: TEAL, border: `1px solid ${TEAL}`,
                borderRadius: 9999, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try Another Photo
            </button>
          </div>
        )}

        {phase === 'duplicate_block' && classify?.duplicate_of && (
          <DuplicateBlockCard existingId={classify.duplicate_of} onReset={resetAll} />
        )}

        {phase === 'ready' && classify && coords && (
          <>
            <AIVerifiedPill classify={classify} />
            <WhereCard
              lat={coords.lat}
              lng={coords.lng}
              ward={classify.ward_name}
              locality={classify.locality_name}
              landmark={landmark}
              onLandmarkChange={setLandmark}
              nearbyReports={nearbyReports}
            />
            <SeveritySelector value={severity} onChange={setSeverity} />
            {(classify.cluster?.cluster_count ?? 0) > 1 && (
              <ClusterBanner
                count={classify.cluster?.cluster_count ?? 0}
                ward={classify.ward_name ?? ''}
                nearbyReports={nearbyReports as unknown as PublicReport[]}
                oldestReportAt={
                  nearbyReports.length > 0
                    ? nearbyReports.reduce(
                        (oldest, r) =>
                          r.created_at < oldest ? r.created_at : oldest,
                        nearbyReports[0].created_at,
                      )
                    : null
                }
                escalationCount={
                  nearbyReports.filter(r => (r.escalation_level ?? 0) >= 1).length
                }
              />
            )}
            <LetterCard
              draft={draft}
              expanded={letterExpanded}
              onToggle={() => setLetterExpanded(x => !x)}
            />
            <AgentModeToggle value={autoDispatch} onChange={setAutoDispatch} />
            {autoDispatch && (
              <CitizenEmailInput value={citizenEmail} onChange={setCitizenEmail} />
            )}
          </>
        )}
      </div>

      {/* Sticky bottom CTA */}
      {(phase === 'ready' || phase === 'submitting') && (
        <StickyBottomCTA
          enabled={submitEnabled}
          loading={phase === 'submitting'}
          onSubmit={handleSubmit}
          autoDispatch={autoDispatch}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 110, transform: 'translateX(-50%)',
          background: DARK3, color: TEXT_PRIMARY, padding: '10px 16px',
          borderRadius: 9999, border: '1px solid rgba(138,158,150,0.25)',
          fontSize: '0.9rem', zIndex: 50, maxWidth: '90vw',
        }}>
          {toast}
        </div>
      )}
    </main>
  )
}

// ─── PhotoCard ────────────────────────────────────────────────────────────────

interface PhotoCardProps {
  imageBase64: string | null
  phase: Phase
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRetake: () => void
}

function PhotoCard({ imageBase64, phase, fileInputRef, onCapture, onRetake }: PhotoCardProps) {
  const isReady = phase === 'ready' || phase === 'submitting' || phase === 'submitted'
  const isClassifying = phase === 'classifying'

  return (
    <div
      onClick={() => {
        if (phase === 'idle') fileInputRef.current?.click()
      }}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 12,
        overflow: 'hidden',
        background: DARK2,
        border: imageBase64 ? '1px solid rgba(138,158,150,0.18)' : `2px dashed ${TEAL}`,
        cursor: phase === 'idle' ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCapture}
        style={{ display: 'none' }}
      />

      {!imageBase64 && (
        <div style={{ textAlign: 'center', color: TEXT_MUTED }}>
          <Camera size={42} style={{ color: TEAL, marginBottom: 8 }} />
          <div style={{ fontSize: '1rem', color: TEXT_PRIMARY, fontWeight: 600 }}>
            Take a photo
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Tap to open camera
          </div>
        </div>
      )}

      {imageBase64 && (
        <img
          src={imageBase64}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {isClassifying && (
        <>
          <div className="scan-overlay" />
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(8,15,12,0.85)', color: TEAL,
            padding: '4px 10px', borderRadius: 9999,
            fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(15,110,86,0.4)',
          }}>
            <Sparkles size={12} /> AI is verifying…
          </div>
        </>
      )}

      {isReady && imageBase64 && (
        <>
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(15,110,86,0.95)', color: 'white',
            padding: '4px 10px', borderRadius: 9999,
            fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle2 size={12} /> Verified
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRetake() }}
            style={{
              position: 'absolute', bottom: 10, right: 10,
              background: 'rgba(8,15,12,0.85)', color: TEXT_PRIMARY,
              padding: '6px 12px', borderRadius: 9999,
              fontSize: '0.75rem', fontWeight: 500,
              border: '1px solid rgba(138,158,150,0.3)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <RotateCcw size={12} /> Retake
          </button>
        </>
      )}
    </div>
  )
}

// ─── Duplicate block ──────────────────────────────────────────────────────────

function DuplicateBlockCard({ existingId, onReset }: { existingId: string; onReset: () => void }) {
  return (
    <div className="section" style={{
      marginTop: 14, padding: 18, borderRadius: 14,
      background: DARK2, border: `1px solid ${GOLD}55`,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Users size={20} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 600, color: TEXT_PRIMARY }}>
            Already reported
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: '0.9rem', marginTop: 4 }}>
            This exact issue is already on record as <strong style={{ color: GOLD }}>{existingId}</strong>.
            Filing again won&apos;t speed it up — but you can track the existing report.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Link
          href={`/report/${existingId}`}
          style={{
            flex: 1, textAlign: 'center', minHeight: 44,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: TEAL, color: 'white', fontWeight: 600,
            borderRadius: 9999, textDecoration: 'none', padding: '0 16px',
          }}
        >
          View Existing Report
        </Link>
        <button
          onClick={onReset}
          style={{
            flex: 1, minHeight: 44,
            background: 'transparent', color: TEAL, border: `1px solid ${TEAL}`,
            borderRadius: 9999, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Different Issue
        </button>
      </div>
    </div>
  )
}

// ─── AI Verified pill ─────────────────────────────────────────────────────────

function AIVerifiedPill({ classify }: { classify: ClassifyResponse }) {
  const triageColor =
    classify.triage_level === 1 ? RED :
    classify.triage_level === 2 ? AMBER : TEAL
  return (
    <div className="section" style={{
      marginTop: 14, padding: '12px 14px', borderRadius: 12,
      background: DARK2, border: '1px solid rgba(138,158,150,0.15)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        background: 'rgba(15,110,86,0.18)', color: TEAL,
        padding: 6, borderRadius: 9999,
        display: 'inline-flex', alignItems: 'center',
      }}>
        <CheckCircle2 size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontSize: '0.95rem' }}>
          {classify.issue_type ?? 'Civic issue'} detected
        </div>
        {classify.description && (
          <div style={{
            color: TEXT_MUTED, fontSize: '0.8rem', marginTop: 2,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {classify.description}
          </div>
        )}
      </div>
      {classify.triage_label && (
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: triageColor,
          border: `1px solid ${triageColor}55`, padding: '3px 8px',
          borderRadius: 9999, whiteSpace: 'nowrap',
        }}>
          {classify.triage_label}
        </span>
      )}
    </div>
  )
}

// ─── Where card ───────────────────────────────────────────────────────────────

interface WhereCardProps {
  lat: number
  lng: number
  ward: string | null
  locality: string | null
  landmark: string
  onLandmarkChange: (v: string) => void
  nearbyReports: NearbyReportLite[]
}

function WhereCard({ lat, lng, ward, locality, landmark, onLandmarkChange, nearbyReports }: WhereCardProps) {
  const mapNearby = useMemo(
    () => nearbyReports.map(r => ({
      id: r.id, lat: r.lat, lng: r.lng,
      triage_level: r.triage_level ?? 3,
    })),
    [nearbyReports],
  )
  return (
    <div className="section" style={{
      marginTop: 12, padding: 14, borderRadius: 12,
      background: DARK2, border: '1px solid rgba(138,158,150,0.15)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: TEXT_MUTED, fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600,
      }}>
        <MapPin size={12} /> Where
      </div>
      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
        <MiniMap
          lat={lat}
          lng={lng}
          wardName={ward ?? undefined}
          nearbyReports={mapNearby}
          height="160px"
          interactive={false}
          showCenterPin
        />
      </div>
      <div style={{ fontSize: '0.95rem', color: TEXT_PRIMARY, fontWeight: 500 }}>
        {locality ?? 'Bengaluru'}
        {ward && <span style={{ color: TEXT_MUTED, fontWeight: 400 }}> · {ward}</span>}
      </div>
      <input
        type="text"
        value={landmark}
        onChange={(e) => onLandmarkChange(e.target.value)}
        placeholder="Add a landmark (optional)"
        style={{ marginTop: 10 }}
      />
    </div>
  )
}

// ─── Severity selector ────────────────────────────────────────────────────────

function SeveritySelector({ value, onChange }: { value: SeverityChoice; onChange: (v: SeverityChoice) => void }) {
  const options: Array<{ key: SeverityChoice; label: string; color: string }> = [
    { key: 'low',      label: 'Low',      color: TEAL },
    { key: 'med',      label: 'Medium',   color: GOLD },
    { key: 'high',     label: 'High',     color: AMBER },
    { key: 'critical', label: 'Critical', color: RED },
  ]
  return (
    <div className="section" style={{
      marginTop: 12, padding: 14, borderRadius: 12,
      background: DARK2, border: '1px solid rgba(138,158,150,0.15)',
    }}>
      <div style={{
        color: TEXT_MUTED, fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600,
      }}>
        Severity
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {options.map(opt => {
          const active = opt.key === value
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                minHeight: 44, borderRadius: 9999,
                background: active ? opt.color : 'transparent',
                color: active ? 'white' : opt.color,
                border: `1px solid ${opt.color}${active ? '' : '55'}`,
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Letter card ──────────────────────────────────────────────────────────────

function LetterCard({ draft, expanded, onToggle }: { draft: DraftContentResponse | null; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="section" style={{
      marginTop: 12, padding: 14, borderRadius: 12,
      background: DARK2, border: '1px solid rgba(138,158,150,0.15)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: TEXT_MUTED, fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600,
      }}>
        <Mail size={12} /> Official Letter
      </div>

      {!draft && (
        <div style={{ color: TEXT_MUTED, fontSize: '0.85rem' }}>
          Drafting your letter…
        </div>
      )}

      {draft && (
        <>
          <div style={{ fontSize: '0.95rem', color: TEXT_PRIMARY, fontWeight: 500 }}>
            {draft.subject}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: '0.8rem', marginTop: 2 }}>
            To: {draft.recipient_name} · {draft.recipient_email}
          </div>

          <div
            style={{
              maxHeight: expanded ? 'none' : 92, overflow: 'hidden',
              marginTop: 10, padding: 10, borderRadius: 8,
              background: DARK3, border: '1px solid rgba(138,158,150,0.12)',
              fontSize: '0.85rem', color: TEXT_PRIMARY, lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              position: 'relative',
            }}
          >
            {draft.body}
            {!expanded && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 36,
                background: `linear-gradient(transparent, ${DARK3})`,
                pointerEvents: 'none',
              }} />
            )}
          </div>

          <button
            onClick={onToggle}
            style={{
              marginTop: 8, background: 'transparent', color: TEAL,
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0,
            }}
          >
            {expanded ? <>Show less <ChevronUp size={14} /></> : <>Read full letter <ChevronDown size={14} /></>}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Agent mode toggle ────────────────────────────────────────────────────────

function AgentModeToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        marginTop: 12, padding: 14, borderRadius: 12, cursor: 'pointer',
        background: value ? 'rgba(15,110,86,0.12)' : DARK2,
        border: `1px solid ${value ? TEAL : 'rgba(138,158,150,0.15)'}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontSize: '0.95rem' }}>
          Auto-dispatch via Nammooru
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: '0.8rem', marginTop: 2 }}>
          We&apos;ll send the email and tweet on your behalf and notify you of replies.
        </div>
      </div>
      <div style={{
        width: 44, height: 26, borderRadius: 9999,
        background: value ? TEAL : 'rgba(138,158,150,0.3)',
        position: 'relative', transition: 'background 0.18s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white', transition: 'left 0.18s',
        }} />
      </div>
    </div>
  )
}

// ─── Citizen email input ──────────────────────────────────────────────────────

function CitizenEmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="section" style={{
      marginTop: 12, padding: 14, borderRadius: 12,
      background: DARK2, border: '1px solid rgba(138,158,150,0.15)',
    }}>
      <label style={{
        display: 'block', color: TEXT_MUTED, fontSize: '0.75rem',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8, fontWeight: 600,
      }}>
        Your email — for status updates
      </label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ─── Sticky bottom CTA ────────────────────────────────────────────────────────

function StickyBottomCTA({
  enabled, loading, onSubmit, autoDispatch,
}: { enabled: boolean; loading: boolean; onSubmit: () => void; autoDispatch: boolean }) {
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
      background: 'rgba(8,15,12,0.95)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(138,158,150,0.15)',
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom)) 16px',
    }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <button
          onClick={onSubmit}
          disabled={!enabled || loading}
          style={{
            width: '100%', minHeight: 52, borderRadius: 9999,
            background: enabled ? TEAL : 'rgba(15,110,86,0.4)',
            color: 'white', fontWeight: 700, fontSize: '1rem',
            border: 'none', cursor: enabled && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? 'Filing…'
            : autoDispatch
              ? 'File & Auto-Dispatch'
              : 'File Report'}
        </button>
      </div>
    </div>
  )
}
