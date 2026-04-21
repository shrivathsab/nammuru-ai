'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Loader2,
  Copy,
  Mail,
  FileDown,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'

import type { DraftEmailResponse } from '@/app/api/draft-email/route'

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
  | { kind: 'ready'; draft: DraftEmailResponse; report: ReportDraft }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMailto(draft: DraftEmailResponse, body: string): string {
  const params = new URLSearchParams({
    subject: draft.subject,
    body,
    cc: draft.cc_emails.join(','),
  })
  return `mailto:${encodeURIComponent(draft.recipient_email)}?${params.toString()}`
}

function buildGmailUrl(draft: DraftEmailResponse, body: string): string {
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

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepPills() {
  const steps = [
    { n: 1, label: 'Capture', done: true },
    { n: 2, label: 'AI Verify', done: true },
    { n: 3, label: 'Draft Email', active: true },
    { n: 4, label: 'Share', done: false },
  ]
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s) => (
        <div
          key={s.n}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            s.active
              ? 'bg-[#0F6E56] text-white'
              : s.done
              ? 'bg-[#E6F3F0] text-[#0F6E56]'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          <span>{s.n}.</span>
          <span>{s.label}</span>
          {s.done && <CheckCircle2 size={12} />}
          {s.active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      ))}
    </div>
  )
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
        const res = await fetch('/api/draft-email', {
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
        const draft = (await res.json()) as DraftEmailResponse
        if (cancelled) return
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
    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state.report,
        email_draft: editedBody,
        report_id: state.draft.report_id,
        recipient_email: state.draft.recipient_email,
        cc_emails: state.draft.cc_emails,
        subject: state.draft.subject,
      }),
    })
      .then((r) => setSubmitStatus(r.ok ? 'saved' : 'failed'))
      .catch(() => setSubmitStatus('failed'))
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold" style={{ color: '#0F6E56' }}>NammuruAI</span>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              ನಮ್ಮ ಊರಿಗಾಗಿ AI — Civic accountability for Bengaluru
            </p>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-6 pb-32">
          <StepPills />

          {state.kind === 'loading' && (
            <div className="flex flex-col items-center text-center gap-5 py-16">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6F3F0' }}
              >
                <Loader2 size={36} className="animate-spin" style={{ color: '#0F6E56' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Claude is drafting your official letter...
                </h1>
                <p className="text-gray-500 max-w-sm">
                  Composing a formal grievance email with legal references and ward-specific routing.
                </p>
              </div>
            </div>
          )}

          {state.kind === 'missing' && (
            <div className="flex flex-col items-center text-center gap-5 py-16">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={30} className="text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">No report found</h1>
                <p className="text-gray-500 text-sm">Please start a new report.</p>
              </div>
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white px-6"
                style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
              >
                Start a new report
              </Link>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="flex flex-col items-center text-center gap-5 py-16">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={30} className="text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Couldn&apos;t draft letter</h1>
                <p className="text-gray-500 text-sm">{state.message}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white px-6"
                style={{ backgroundColor: '#0F6E56', minHeight: '52px' }}
              >
                Try Again
              </button>
            </div>
          )}

          {state.kind === 'ready' && (
            <>
              {/* Section 1 — Header */}
              <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#E6F3F0', color: '#0F6E56' }}
                  >
                    {state.draft.report_id}
                  </span>
                  {submitStatus === 'saved' && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={12} /> Report saved
                    </span>
                  )}
                  {submitStatus === 'saving' && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> Saving…
                    </span>
                  )}
                  {submitStatus === 'failed' && (
                    <span className="text-xs text-amber-600">Save failed — you can still send</span>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-2 flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <span className="text-gray-400 font-medium w-16 flex-shrink-0">TO:</span>
                    <span className="text-gray-900 break-all">
                      {state.draft.recipient_name} &lt;{state.draft.recipient_email}&gt;
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 font-medium w-16 flex-shrink-0">CC:</span>
                    <span className="text-gray-700 break-all">{state.draft.cc_emails.join(', ')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 font-medium w-16 flex-shrink-0">SUBJECT:</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-900 font-medium">{state.draft.subject}</span>
                      <span className="text-gray-400 text-xs">{state.draft.subject_kannada}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2 — Editable body */}
              <section className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Letter body</label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent"
                  style={{ minHeight: '400px' }}
                />
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>You can edit this letter before sending.</span>
                  <span>{editedBody.length} characters</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Pastes with formatting into Gmail. Plain text in all other apps.
                </p>
              </section>

              {/* Next step */}
              <Link
                href="/report/tweet"
                className="self-end inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: '#0F6E56' }}
              >
                Generate Tweet Thread <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Section 3 — Sticky action bar */}
      {state.kind === 'ready' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-2">
            <button
              onClick={() => void handleCopy()}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-base"
              style={{ backgroundColor: copied ? '#0B5A45' : '#0F6E56', minHeight: '52px' }}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={18} /> Copied! Open your email app and paste.
                </>
              ) : (
                <>
                  <Copy size={18} /> Copy Email to Clipboard
                </>
              )}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={buildGmailUrl(state.draft, editedBody)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl font-semibold text-gray-700 text-sm border border-gray-300 bg-white"
                style={{ minHeight: '44px' }}
              >
                <Mail size={16} /> Open in Gmail
              </a>
              <button
                onClick={() => alert('PDF export coming soon.')}
                className="flex items-center justify-center gap-2 rounded-xl font-semibold text-gray-400 text-sm border border-gray-200 bg-gray-50"
                style={{ minHeight: '44px' }}
              >
                <FileDown size={16} /> Download as PDF
              </button>
            </div>
            <a
              href={buildMailto(state.draft, editedBody)}
              className="text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Having trouble? Click here to open in your email app →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
