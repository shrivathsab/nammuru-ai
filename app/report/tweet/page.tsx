'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  X as XIcon,
} from 'lucide-react'

import { AppShell } from '@/components/AppShell'
import { reportUrl, reportDisplayUrl } from '@/lib/config'
import { tokens } from '@/lib/design-tokens'

const TEAL = tokens.colors.teal
const DARK2 = tokens.colors.dark2
const DARK3 = tokens.colors.dark3
const GOLD = tokens.colors.gold
const RED = tokens.colors.red
const TEXT_PRIMARY = tokens.colors.textPrimary
const TEXT_MUTED = tokens.colors.textMuted

interface TweetDraft {
  tweet_primary: string
  tweet_reply_evidence: string
  tweet_reply_escalation: string
  report_id_human: string
  issue_type: string
  locality: string
  triage_label: string
  captured_image_url?: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; draft: TweetDraft }

function isTweetDraft(value: unknown): value is TweetDraft {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.tweet_primary === 'string' &&
    typeof v.report_id_human === 'string' &&
    typeof v.issue_type === 'string' &&
    typeof v.locality === 'string' &&
    typeof v.triage_label === 'string'
  )
}

export default function TweetPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [tweetText, setTweetText] = useState('')
  const [copiedPrimary, setCopiedPrimary] = useState(false)
  const [copiedEvidence, setCopiedEvidence] = useState(false)
  const [copiedEscalation, setCopiedEscalation] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [showEscalation, setShowEscalation] = useState(false)
  const [sahaayaSR, setSahaayaSR] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('nammuru_report_draft')
    if (!raw) {
      setState({ kind: 'missing' })
      return
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isTweetDraft(parsed)) {
        setState({ kind: 'missing' })
        return
      }
      setTweetText(parsed.tweet_primary)
      setState({ kind: 'ready', draft: parsed })
    } catch {
      setState({ kind: 'missing' })
    }
  }, [])

  const copyText = useCallback(
    async (text: string, setter: (v: boolean) => void) => {
      try {
        await navigator.clipboard.writeText(text)
        setter(true)
        setTimeout(() => setter(false), 3000)
      } catch {
        // noop
      }
    },
    []
  )

  const draft = state.kind === 'ready' ? state.draft : null
  const reportId = draft?.report_id_human
  const publicUrl = reportId
    ? reportUrl(reportId)
    : null
  const publicUrlDisplay = reportId
    ? reportDisplayUrl(reportId)
    : null
  const capturedImage = draft?.captured_image_url ?? null

  const charCount = tweetText.length
  const overLimit = charCount > 280

  return (
    <AppShell currentStep={4}>
      <style>{`
        textarea.tweet-area {
          background: ${DARK3};
          color: ${TEXT_PRIMARY};
          border: 1px solid rgba(15,110,86,0.3);
          font-family: 'DM Sans', sans-serif;
          border-radius: 0.75rem;
          padding: 1rem;
          font-size: 0.95rem;
          line-height: 1.6;
          outline: none;
          resize: vertical;
          width: 100%;
          min-height: 120px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        textarea.tweet-area:focus {
          border-color: ${TEAL};
          box-shadow: 0 0 0 3px rgba(15,110,86,0.12);
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>

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

        {state.kind === 'ready' && (
          <div className="card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Section title */}
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.375rem' }}>
                Share Your Report
              </h1>
              <p style={{ color: TEXT_MUTED, fontSize: '0.9rem' }}>
                Copy and post to create public pressure for faster action.
              </p>
            </div>

            {capturedImage ? (
              <div className="mb-4">
                <img
                  src={capturedImage}
                  alt="Your report photo"
                  className="w-full rounded-xl object-cover max-h-48"
                  style={{ border: '1px solid rgba(15,110,86,0.3)' }}
                />
                <p className="text-xs mt-2 flex items-center gap-1"
                   style={{ color: '#8a9e96' }}>
                  <span style={{ color: '#d4a843' }}>📎</span>
                  Long-press to save, then attach when posting for maximum impact
                </p>
              </div>
            ) : (
              <p className="text-xs mb-4 flex items-center gap-1"
                 style={{ color: '#8a9e96' }}>
                <span style={{ color: '#d4a843' }}>📎</span>
                Attach your photo when posting for maximum impact
              </p>
            )}

            {/* PRIMARY TWEET CARD */}
            <section style={{ background: DARK2, borderRadius: '0.875rem', border: `1px solid rgba(15,110,86,0.2)`, borderLeft: `4px solid ${TEAL}`, padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XIcon size={16} style={{ color: TEAL }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_PRIMARY, fontFamily: "'DM Sans', sans-serif" }}>
                  Your Tweet
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem',
                    color: overLimit ? RED : TEXT_MUTED,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    background: overLimit ? 'rgba(229,62,62,0.1)' : 'rgba(138,158,150,0.08)',
                    border: `1px solid ${overLimit ? 'rgba(229,62,62,0.4)' : 'rgba(138,158,150,0.2)'}`,
                  }}
                >
                  {charCount}/280
                </span>
              </div>

              <textarea
                className="tweet-area"
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
              />

              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  background: 'rgba(15,110,86,0.12)',
                  color: TEAL,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  border: `1px solid rgba(15,110,86,0.3)`,
                }}>
                  {state.draft.report_id_human}
                </span>
              </div>

              <input
                type="text"
                placeholder="Sahaaya SR No. (optional — call 1533)"
                value={sahaayaSR}
                onChange={(e) => setSahaayaSR(e.target.value)}
                style={{
                  width: '100%',
                  background: DARK3,
                  color: TEXT_PRIMARY,
                  border: '1px solid rgba(15,110,86,0.3)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                }}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={() => void copyText(tweetText, setCopiedPrimary)}
                  className="btn-teal-glow"
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    borderRadius: '9999px', fontWeight: 600, fontSize: '0.95rem',
                    color: 'white',
                    background: copiedPrimary ? '#0a5240' : TEAL,
                    minHeight: '48px', border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.2s ease',
                  }}
                >
                  {copiedPrimary ? (
                    <><Check size={16} /> ✓ Copied! Paste into X/Twitter.</>
                  ) : (
                    <><Copy size={16} /> Copy Tweet</>
                  )}
                </button>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    borderRadius: '9999px', fontWeight: 500, fontSize: '0.9rem',
                    color: TEAL, background: DARK3,
                    minHeight: '44px',
                    border: `1px solid ${TEAL}`,
                    textDecoration: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Open in X <ExternalLink size={14} />
                </a>
              </div>
            </section>

            {/* OPTIONAL REPLY TWEETS */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Evidence */}
              <div>
                <button
                  onClick={() => setShowEvidence((s) => !s)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'transparent',
                    border: 'none',
                    color: TEAL,
                    fontSize: '0.85rem',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    padding: '0.25rem 0',
                  }}
                >
                  <Plus size={14} style={{ transform: showEvidence ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  Add evidence reply
                </button>
                {showEvidence && (
                  <div className="card-enter" style={{ marginTop: '0.5rem', background: DARK2, borderRadius: '0.75rem', border: `1px solid rgba(15,110,86,0.18)`, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, lineHeight: 1.55, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      {state.draft.tweet_reply_evidence}
                    </p>
                    <button
                      onClick={() => void copyText(state.draft.tweet_reply_evidence, setCopiedEvidence)}
                      style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.4rem 0.875rem',
                        borderRadius: '9999px',
                        background: DARK3,
                        color: TEAL,
                        border: `1px solid ${TEAL}`,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {copiedEvidence ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy reply</>}
                    </button>
                  </div>
                )}
              </div>

              {/* Escalation */}
              <div>
                <button
                  onClick={() => setShowEscalation((s) => !s)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'transparent',
                    border: 'none',
                    color: TEAL,
                    fontSize: '0.85rem',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    padding: '0.25rem 0',
                  }}
                >
                  <Plus size={14} style={{ transform: showEscalation ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  Add escalation reply
                </button>
                {showEscalation && (
                  <div className="card-enter" style={{ marginTop: '0.5rem', background: DARK2, borderRadius: '0.75rem', border: `1px solid rgba(15,110,86,0.18)`, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontSize: '0.85rem', color: TEXT_PRIMARY, lineHeight: 1.55, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                      {state.draft.tweet_reply_escalation}
                    </p>
                    <button
                      onClick={() => void copyText(state.draft.tweet_reply_escalation, setCopiedEscalation)}
                      style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.4rem 0.875rem',
                        borderRadius: '9999px',
                        background: DARK3,
                        color: TEAL,
                        border: `1px solid ${TEAL}`,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {copiedEscalation ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy reply</>}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* PUBLIC REPORT LINK */}
            <section style={{ background: DARK2, borderRadius: '0.875rem', border: `1px solid rgba(212,168,67,0.25)`, borderLeft: `4px solid ${GOLD}`, padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon size={16} style={{ color: GOLD }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_PRIMARY, fontFamily: "'DM Sans', sans-serif" }}>
                  Your Public Report URL
                </span>
              </div>

              {publicUrl ? (
                <div style={{
                  background: DARK3,
                  borderRadius: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.82rem',
                  color: TEAL,
                  userSelect: 'all',
                  wordBreak: 'break-all',
                  border: `1px solid rgba(15,110,86,0.2)`,
                }}>
                  {publicUrlDisplay}
                </div>
              ) : (
                <p className="text-xs text-amber-500">
                  Report ID not found — submit the report first via the email page.
                </p>
              )}

              <button
                disabled={!publicUrl}
                onClick={() => publicUrl && void copyText(publicUrl, setCopiedUrl)}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '9999px',
                  background: 'transparent',
                  color: GOLD,
                  border: `1px solid ${GOLD}`,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {copiedUrl ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy URL</>}
              </button>

              <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                Share this link — anyone can verify your report.
              </p>
            </section>

            {/* NEXT STEP hint */}
            <div style={{ textAlign: 'center', padding: '1rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                Your report is filed, your letter is ready, your tweet is set.
              </p>
              <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                NammuruAI will track this report publicly.
              </p>
              <Link
                href={`/report/${state.draft.report_id_human}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  color: TEAL,
                  fontSize: '0.88rem',
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none',
                  marginTop: '0.375rem',
                  fontWeight: 500,
                }}
              >
                View your public report <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
