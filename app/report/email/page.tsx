'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Copy,
  Mail,
  FileDown,
  ArrowRight,
  AlertTriangle,
  FileText,
  Check,
  ExternalLink,
} from 'lucide-react'

import { createClient } from '@supabase/supabase-js'

import type { DraftContentResponse } from '@/lib/types'
import { AppShell } from '@/components/AppShell'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      .upload(fileName, blob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) {
      console.warn('[Image upload] Failed:', error.message)
      return null
    }

    const { data } = supabaseClient.storage
      .from('report-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  } catch (e) {
    console.warn('[Image upload] Error:', e)
    return null
  }
}
import { ReportIdBadge } from '@/components/ui/ReportIdBadge'
import { TealSpinner } from '@/components/ui/TealSpinner'
import { tokens } from '@/lib/design-tokens'

// ─── Local aliases (kept to minimise diff within inline styles) ──────────────

const TEAL = tokens.colors.teal
const DARK2 = tokens.colors.dark2
const DARK3 = tokens.colors.dark3
const GOLD = tokens.colors.gold
const RED = tokens.colors.red
const AMBER = tokens.colors.amber
const TEXT_PRIMARY = tokens.colors.textPrimary
const TEXT_MUTED = tokens.colors.textMuted

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportDraft {
  issue_type: string
  severity: string
  triage_level: number
  triage_label: string
  description: string
  locality: string
  ward_name: string
  ward_zone: string
  nearest_landmark: string | null
  pincode: string | null
  lat: number
  lng: number
  cluster_count: number
  cluster_suggested_action: string | null
  report_hash: string
  image_url?: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; draft: DraftContentResponse; report: ReportDraft }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMailto(draft: DraftContentResponse, body: string): string {
  const params = new URLSearchParams({
    subject: draft.subject,
    body,
    cc: draft.cc_emails.join(','),
  })
  return `mailto:${encodeURIComponent(draft.recipient_email)}?${params.toString()}`
}

function buildGmailUrl(draft: DraftContentResponse, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: draft.recipient_email,
    cc: draft.cc_emails.join(','),
    su: draft.subject,
    body,
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

async function copyToClipboard(subject: string, body: string) {
  const htmlBody = body
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')

  const htmlContent = `<b>Subject:</b> ${subject}<br><br>${htmlBody}`
  const plainContent = `Subject: ${subject}\n\n${body.replace(/\*\*(.*?)\*\*/g, '$1')}`

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([htmlContent], { type: 'text/html' }),
      'text/plain': new Blob([plainContent], { type: 'text/plain' }),
    }),
  ])
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^>\s+/gm, '')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailDraftPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [editedBody, setEditedBody] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const submittedRef = useRef(false)

  // ── Load report and draft ─────────────────────────────────────────────────

  useEffect(() => {
    const raw = sessionStorage.getItem('nammuru_report_draft')
    if (!raw) {
      setState({ kind: 'missing' })
      return
    }

    let report: ReportDraft
    try {
      report = JSON.parse(raw) as ReportDraft
    } catch {
      setState({ kind: 'missing' })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/draft-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        })
        if (!res.ok) {
          const msg = res.status === 429
            ? 'Too many requests. Please wait a moment and refresh.'
            : 'Failed to draft the letter. Please try again.'
          if (!cancelled) setState({ kind: 'error', message: msg })
          return
        }
        const draft = (await res.json()) as DraftContentResponse
        if (cancelled) return
        const existing = JSON.parse(
          sessionStorage.getItem('nammuru_report_draft') ?? '{}'
        )
        sessionStorage.setItem('nammuru_report_draft', JSON.stringify({
          ...existing,
          tweet_primary: draft.tweet.primary,
          tweet_reply_evidence: draft.tweet.reply_evidence,
          tweet_reply_escalation: draft.tweet.reply_escalation,
          report_id_human: draft.report_id,
          recipient_email: draft.recipient_email,
          subject: draft.subject,
        }))
        setEditedBody(stripMarkdown(draft.body))
        setState({ kind: 'ready', draft, report })
      } catch {
        if (!cancelled) setState({ kind: 'error', message: 'Network error. Please try again.' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // ── Fire-and-forget submit to Supabase ────────────────────────────────────

  useEffect(() => {
    if (state.kind !== 'ready' || submittedRef.current) return
    submittedRef.current = true
    setSubmitStatus('saving')

    const draft = JSON.parse(
      sessionStorage.getItem('nammuru_report_draft') ?? '{}'
    )
    const data = {
      report_id: state.draft.report_id,
      subject: state.draft.subject,
      body: editedBody,
      recipient_email: state.draft.recipient_email,
      tweet: state.draft.tweet,
    }

    ;(async () => {
    const capturedImageUrl = draft.captured_image_url
    const imageUrl = capturedImageUrl
      ? await uploadReportImage(capturedImageUrl, draft.report_hash)
      : null

    console.log('[Image upload] result:', imageUrl)

    const submitPayload = {
      // Core location fields
      lat:           draft.lat,
      lng:           draft.lng,
      ward_name:     draft.ward_name,
      ward_zone:     draft.ward_zone,
      locality_name: draft.locality_name ?? draft.locality ?? null,
      pincode:       draft.pincode ?? null,
      nearest_landmark: draft.nearest_landmark ?? null,
      manual_location:  draft.manual_location ?? false,

      // Issue fields
      issue_type:    draft.issue_type,
      severity:      draft.severity,
      triage_level:  draft.triage_level,
      cluster_count: draft.cluster_count ?? 1,
      description:   draft.description,

      // Report identity
      report_hash:     draft.report_hash,
      report_id_human: data.report_id,
      status:          'open',

      // Email fields
      email_subject:   data.subject,
      email_draft:     data.body,
      email_recipient: data.recipient_email,

      // Tweet fields
      tweet_primary:          data.tweet.primary,
      tweet_reply_evidence:   data.tweet.reply_evidence,
      tweet_reply_escalation: data.tweet.reply_escalation,

      // Flags
      private_property_detected: draft.private_property_detected ?? false,

      // Image
      image_url: imageUrl,
    }

    console.log('[Submit payload] report_id_human:', state.draft.report_id)

    console.log('[Submit payload fields]', {
      lat:          submitPayload.lat,
      lng:          submitPayload.lng,
      issue_type:   submitPayload.issue_type,
      report_hash:  submitPayload.report_hash,
      report_id_human: submitPayload.report_id_human,
      locality_name:   submitPayload.locality_name,
    })

    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload),
      })
      const d = await r.json().catch(() => ({}))
      console.log('[Submit result]', JSON.stringify(d))
      setSubmitStatus(r.ok ? 'saved' : 'failed')
    } catch (e) {
      console.error('[Submit error]', e instanceof Error ? e.message : String(e))
      setSubmitStatus('failed')
    }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind])

  // ── Clipboard ─────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (state.kind !== 'ready') return
    try {
      await copyToClipboard(state.draft.subject, editedBody)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // noop — mailto fallback remains visible
    }
  }, [state, editedBody])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppShell currentStep={3}>
      <style>{`
        textarea {
          background: ${DARK3};
          color: ${TEXT_PRIMARY};
          border: 1px solid rgba(15,110,86,0.3);
          font-family: 'DM Sans', sans-serif;
          border-radius: 0.75rem;
          padding: 1rem;
          font-size: 0.9rem;
          line-height: 1.75;
          outline: none;
          resize: vertical;
          width: 100%;
          min-height: 420px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        textarea:focus {
          border-color: ${TEAL};
          box-shadow: 0 0 0 3px rgba(15,110,86,0.12);
        }
        textarea::placeholder { color: ${TEXT_MUTED}; }

        .email-field-row {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(15,110,86,0.1);
          font-size: 0.875rem;
          align-items: flex-start;
        }
        .email-field-label {
          color: ${TEXT_MUTED};
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          width: 4.5rem;
          flex-shrink: 0;
          padding-top: 2px;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>

            {/* ── Loading ───────────────────────────────────────────────── */}
            {state.kind === 'loading' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', paddingTop: '3rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15,110,86,0.08)', border: `1px solid rgba(15,110,86,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TealSpinner size="md" />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.875rem' }}>
                    Claude is drafting your official letter...
                  </h1>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {['Resolving ward officer...', 'Generating statutory references...', 'Drafting formal letter...'].map((text, i) => (
                      <p key={text} style={{ fontSize: '0.875rem', color: TEXT_MUTED, animation: `fadeInUp 0.4s ease-out ${i * 200}ms both` }}>{text}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Missing ───────────────────────────────────────────────── */}
            {state.kind === 'missing' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', paddingTop: '3rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(229,62,62,0.08)', border: `1px solid rgba(229,62,62,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={28} style={{ color: RED }} />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.375rem' }}>No report found</h1>
                  <p style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>Please start a new report.</p>
                </div>
                <Link
                  href="/report"
                  className="btn-teal-glow"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', padding: '0 2rem', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '1rem' }}
                >
                  Start a new report
                </Link>
              </div>
            )}

            {/* ── Error ─────────────────────────────────────────────────── */}
            {state.kind === 'error' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', paddingTop: '3rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(229,62,62,0.08)', border: `1px solid rgba(229,62,62,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={28} style={{ color: RED }} />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.375rem' }}>Couldn&apos;t draft letter</h1>
                  <p style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>{state.message}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-teal-glow"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', fontWeight: 600, color: 'white', background: TEAL, minHeight: '52px', padding: '0 2rem', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '1rem' }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* ── Ready ─────────────────────────────────────────────────── */}
            {state.kind === 'ready' && (
              <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* SECTION A — Email Header Card */}
                <section style={{ background: DARK2, borderRadius: '0.875rem', border: `1px solid rgba(15,110,86,0.18)`, overflow: 'hidden' }}>
                  {/* macOS window bar */}
                  <div style={{ background: DARK3, padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', borderBottom: `1px solid rgba(15,110,86,0.1)` }}>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: TEXT_MUTED }}>Official Grievance Letter</span>
                    <ReportIdBadge id={state.draft.report_id} />
                  </div>

                  {/* Email fields */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="email-field-row">
                      <span className="email-field-label">TO</span>
                      <span style={{ color: TEXT_PRIMARY }}>
                        {state.draft.recipient_name}{' '}
                        <span style={{ color: TEAL, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                          &lt;{state.draft.recipient_email}&gt;
                        </span>
                      </span>
                    </div>
                    <div className="email-field-row">
                      <span className="email-field-label">CC</span>
                      <span style={{ color: TEAL, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                        {state.draft.cc_emails.join(', ')}
                      </span>
                    </div>
                    <div className="email-field-row">
                      <span className="email-field-label">SUBJECT</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{state.draft.subject}</span>
                        <span style={{ color: TEXT_MUTED, fontSize: '0.8rem' }}>{state.draft.subject_kannada}</span>
                      </div>
                    </div>

                    {/* Status / report ID row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: 'rgba(15,110,86,0.04)' }}>
                      <span style={{ fontSize: '0.68rem', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>REPORT ID</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {submitStatus === 'saved' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: TEAL }}>
                            <CheckCircle2 size={12} /> Saved
                          </span>
                        )}
                        {submitStatus === 'saving' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: TEXT_MUTED }}>
                            <div className="spinner-teal-sm" /> Saving…
                          </span>
                        )}
                        {submitStatus === 'failed' && (
                          <span style={{ fontSize: '0.75rem', color: AMBER }}>Save failed — you can still send</span>
                        )}
                        <ReportIdBadge id={state.draft.report_id} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION B — Editable body */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} style={{ color: TEAL }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_PRIMARY }}>Letter Draft</span>
                    <span style={{ fontSize: '0.8rem', color: TEXT_MUTED, marginLeft: 'auto' }}>You can edit before sending</span>
                  </div>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{editedBody.length} characters</span>
                  </div>
                </section>

                {/* Next step — Amplify */}
                {(() => {
                  const reportId = state.draft.report_id
                  const missing: string[] = []
                  if (!reportId) missing.push('report ID')
                  if (state.report.lat == null || state.report.lng == null) missing.push('location')
                  if (!state.report.issue_type) missing.push('issue type')
                  if (!state.report.ward_name) missing.push('ward')
                  const disabled = missing.length > 0

                  if (disabled) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div
                          aria-disabled="true"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '9999px', border: `1px solid rgba(212,168,67,0.25)`, background: 'rgba(212,168,67,0.03)', padding: '0.875rem 1.25rem', color: GOLD, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.9375rem', opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          <span>Continue to Amplify</span>
                          <ArrowRight size={16} style={{ color: GOLD }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: "'DM Sans', sans-serif" }}>
                          Missing {missing.join(', ')} — cannot continue to Amplify.
                        </span>
                      </div>
                    )
                  }

                  return (
                    <Link
                      href={`/report/${reportId}/amplify`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '9999px', border: `1px solid rgba(212,168,67,0.45)`, background: 'rgba(212,168,67,0.05)', padding: '0.875rem 1.25rem', textDecoration: 'none', color: GOLD, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.9375rem', transition: 'background 0.2s ease' }}
                    >
                      <span>Continue to Amplify</span>
                      <ArrowRight size={16} style={{ color: GOLD }} />
                    </Link>
                  )
                })()}
              </div>
            )}

        {/* ── Sticky action bar ────────────────────────────────────────────── */}
        {state.kind === 'ready' && (
          <div style={{ position: 'sticky', bottom: 0, marginLeft: '-1rem', marginRight: '-1rem', marginTop: '1.5rem', background: 'rgba(8,15,12,0.96)', backdropFilter: 'blur(12px)', borderTop: `1px solid rgba(15,110,86,0.2)` }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

              {/* Primary — Copy */}
              <button
                onClick={() => void handleCopy()}
                className="btn-teal-glow"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  borderRadius: '9999px', fontWeight: 600, fontSize: '1rem',
                  color: 'white',
                  background: copied ? '#0a5240' : TEAL,
                  minHeight: '52px', border: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.2s ease',
                }}
              >
                {copied ? (
                  <><Check size={18} /> ✓ Copied! Open your email app and paste.</>
                ) : (
                  <><Copy size={18} /> Copy Email to Clipboard</>
                )}
              </button>

              {/* Secondary row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <a
                  href={buildGmailUrl(state.draft, editedBody)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '9999px', fontWeight: 500, color: TEAL, background: DARK3, minHeight: '44px', border: `1px solid ${TEAL}`, textDecoration: 'none', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s ease' }}
                >
                  <Mail size={14} /> Open in Gmail <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => alert('PDF export coming soon.')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '9999px', fontWeight: 500, color: GOLD, background: DARK3, minHeight: '44px', border: `1px solid rgba(212,168,67,0.4)`, fontSize: '0.875rem', cursor: 'not-allowed', opacity: 0.7, fontFamily: "'DM Sans', sans-serif" }}
                  title="Coming soon — Day 10"
                >
                  <FileDown size={14} /> Download as PDF
                </button>
              </div>

              {/* Mailto fallback */}
              <a
                href={buildMailto(state.draft, editedBody)}
                style={{ textAlign: 'center', fontSize: '0.75rem', color: TEXT_MUTED, textDecoration: 'none' }}
              >
                Having trouble?{' '}
                <span style={{ color: TEAL, textDecoration: 'underline' }}>Open directly in your email app →</span>
              </a>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
