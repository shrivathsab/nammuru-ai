'use client'

import Link from 'next/link'
import {
  MapPin,
  Building2,
  Camera,
  Bot,
  Mail,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  Scale,
  Navigation,
  RotateCcw,
  XCircle,
  CheckCircle2,
} from 'lucide-react'

export default function HomePage() {
  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault()
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ─── SECTION 1 — HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0a1a14] text-white">
        {/* Nav */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <div className="text-lg font-bold tracking-tight text-[#0F6E56] sm:text-xl">
              NammuruAI
            </div>
            <div className="text-[11px] text-gray-400">ನಮ್ಮ ಊರು</div>
          </div>
          <Link
            href="/report"
            className="rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d5f4a] sm:px-5"
          >
            File a Report →
          </Link>
        </nav>

        {/* Hero content */}
        <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 text-center sm:px-8 sm:pt-20">
          <span className="inline-flex items-center rounded-full border border-[#0F6E56]/40 bg-[#0F6E56]/10 px-3 py-1 text-xs font-medium text-[#4ade97]">
            Bengaluru's First AI Civic Platform
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Report civic issues.
            <br />
            <span className="text-[#0F6E56]">Claude fixes the paperwork.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-gray-300 sm:text-lg">
            Capture a photo. AI verifies, classifies, and drafts a formal legal
            letter to your BBMP ward officer — in 30 seconds.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/report"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#0F6E56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d5f4a] sm:w-auto"
            >
              Report an Issue →
            </Link>
            <a
              href="#how-it-works"
              onClick={scrollToHowItWorks}
              className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              See How It Works
            </a>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-xs text-gray-400 sm:flex-row sm:gap-6 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#0F6E56]" />
              28 BVT tests passing
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[#0F6E56]" />
              5 BBMP pilot wards
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#0F6E56]" />
              ₹0 to file a report
            </span>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 — HOW IT WORKS ─────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. Thirty seconds.
          </h2>

          <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <StepCard
              icon={<Camera className="h-6 w-6" />}
              emoji="📸"
              title="Capture"
              body="Point your camera at the issue. GPS auto-detects your ward."
            />
            <ArrowRight className="mx-auto hidden h-6 w-6 text-[#0F6E56] md:block" />
            <StepCard
              icon={<Bot className="h-6 w-6" />}
              emoji="🤖"
              title="AI Verifies"
              body="Claude Vision validates the image, classifies the issue, and assigns triage level."
            />
            <ArrowRight className="mx-auto hidden h-6 w-6 text-[#0F6E56] md:block" />
            <StepCard
              icon={<Mail className="h-6 w-6" />}
              emoji="✉️"
              title="Draft & Send"
              body="A formal legal letter is drafted to your BBMP ward officer with statutory references."
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION 3 — AI VALIDATION GATE ───────────────────────── */}
      <section className="bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Every report is verified before it reaches BBMP.
          </h2>
          <p className="mt-3 text-center text-base text-gray-600">
            Claude Vision rejects invalid submissions automatically.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Rejected */}
            <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-500 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-red-600">
                <XCircle className="h-5 w-5" />
                Rejected
              </div>
              <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                Screenshot detected
              </div>
              <div className="mt-4">
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  screenshot
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-700">
                Please submit a direct photo of the issue, not a photo of a screen.
              </p>
            </div>

            {/* Accepted */}
            <div className="rounded-xl border border-gray-200 border-l-4 border-l-[#0F6E56] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#0F6E56]">
                <CheckCircle2 className="h-5 w-5" />
                Verified
              </div>
              <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                Real outdoor photo
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="teal">Pothole</Pill>
                <Pill tone="amber">High Severity</Pill>
                <Pill tone="red">URGENT L1</Pill>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  HSR Layout, Bengaluru
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  HSR Layout Ward · Bommanahalli Zone
                </div>
                <div className="text-xs text-gray-500">94% confidence</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4 — EMAIL DRAFT PREVIEW ──────────────────────── */}
      <section className="bg-[#0F6E56] px-5 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Claude drafts the legal letter. You just hit send.
          </h2>

          <div className="relative mt-12 overflow-hidden rounded-xl bg-white text-gray-900 shadow-2xl">
            <div className="space-y-2 border-b border-gray-200 px-6 py-4 text-sm">
              <div>
                <span className="font-semibold text-gray-500">TO:</span>{' '}
                Ward Officer, HSR Layout Ward &lt;hsrlayout.ward@bbmp.gov.in&gt;
              </div>
              <div>
                <span className="font-semibold text-gray-500">CC:</span>{' '}
                grievance@bbmp.gov.in
              </div>
              <div>
                <span className="font-semibold text-gray-500">SUBJECT:</span>{' '}
                [Report NMR-20260421-A7F3] URGENT: Pothole at HSR Layout — Action Required
              </div>
              <div className="text-xs text-gray-500">
                ವರದಿ NMR-20260421-A7F3: HSR Layoutದಲ್ಲಿ Pothole — ತಕ್ಷಣ ಕ್ರಮ ಅಗತ್ಯ
              </div>
            </div>

            <div className="px-6 py-5">
              <span className="inline-flex rounded-full bg-[#0F6E56]/10 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                NMR-20260421-A7F3
              </span>

              <div className="relative mt-4 text-sm leading-relaxed text-gray-800">
                <p>Dear Ward Officer,</p>
                <p className="mt-3">
                  I write to formally report a High Severity pothole at HSR
                  Layout, Bengaluru (GPS: 12.9116, 77.6370). This matter is
                  filed under Report ID NMR-20260421-A7F3 via the NammuruAI
                  civic platform...
                </p>
                <p className="mt-3 text-gray-600">
                  [BBMP Act 1976 Section 58 reference...]
                </p>
                <div className="mt-4 text-xs italic text-gray-500">...continues</div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <OutlinePill icon={<Scale className="h-4 w-4" />}>
              Cites BBMP Act 1976
            </OutlinePill>
            <OutlinePill icon={<Navigation className="h-4 w-4" />}>
              GPS coordinates included
            </OutlinePill>
            <OutlinePill icon={<RotateCcw className="h-4 w-4" />}>
              RTI escalation path
            </OutlinePill>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5 — TRIAGE ───────────────────────────────────── */}
      <section className="bg-gray-50 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            AI assigns urgency. Officers know what to fix first.
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <TriageCard
              tone="red"
              badge="Level 1 · URGENT"
              sla="48-hour response required"
              issues="Potholes (high severity), Encroachments, 10+ cluster reports"
              icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            />
            <TriageCard
              tone="amber"
              badge="Level 2 · MEDIUM"
              sla="7-day response required"
              issues="Garbage, Streetlights (medium severity), 3–9 cluster reports"
              icon={<Clock className="h-6 w-6 text-amber-600" />}
            />
            <TriageCard
              tone="teal"
              badge="Level 3 · ROUTINE"
              sla="Maintenance schedule"
              issues="Minor repairs, low severity, isolated incidents"
              icon={<CheckCircle className="h-6 w-6 text-[#0F6E56]" />}
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION 6 — WARD COVERAGE ────────────────────────────── */}
      <section className="bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pilot coverage: 5 BBMP wards
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Expanding to all 198 wards post-launch.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { name: 'HSR Layout', zone: 'Bommanahalli' },
              { name: 'Koramangala', zone: 'South' },
              { name: 'Indiranagar', zone: 'East' },
              { name: 'Whitefield', zone: 'East' },
              { name: 'Jayanagar', zone: 'South' },
            ].map((w) => (
              <div
                key={w.name}
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm"
              >
                <span className="font-semibold text-gray-900">{w.name}</span>
                <span className="text-gray-500"> · {w.zone}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Outside these wards? Reports are routed to BBMP Grievance Cell.
          </p>
        </div>
      </section>

      {/* ─── SECTION 7 — STATS ────────────────────────────────────── */}
      <section className="bg-[#0a1a14] px-5 py-16 text-white sm:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          <Stat value="5" label="Pilot Wards" />
          <Stat value="3" label="Triage Levels" />
          <Stat value="48h" label="L1 Response SLA" />
          <Stat value="1" label="Claude API call per report" />
        </div>
      </section>

      {/* ─── SECTION 8 — CTA FOOTER ───────────────────────────────── */}
      <section className="bg-[#0F6E56] px-5 py-20 text-center text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See a civic issue? Report it now.
          </h2>
          <p className="mt-3 text-base text-white/80">
            Takes 30 seconds. Claude handles the rest.
          </p>
          <Link
            href="/report"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0F6E56] shadow-lg transition hover:bg-gray-50"
          >
            File a Report →
          </Link>
          <p className="mt-6 text-xs text-white/70">
            Free · No account required · Bengaluru only
          </p>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-[#0a1a14] px-5 py-12 text-gray-300 sm:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="text-lg font-bold text-[#0F6E56]">NammuruAI</div>
            <div className="text-xs text-gray-400">ನಮ್ಮ ಊರು</div>
            <p className="mt-3 text-sm">Built for Bengaluru citizens.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-center">
            <Link href="/report" className="hover:text-white">
              Report an Issue
            </Link>
            <a href="#how-it-works" onClick={scrollToHowItWorks} className="hover:text-white">
              How It Works
            </a>
            <Link href="/about" className="hover:text-white">
              About
            </Link>
          </div>
          <div className="text-sm md:text-right">
            <div className="font-semibold text-white">Built with Claude AI</div>
            <div className="mt-1 text-xs text-gray-400">
              Powered by Anthropic's Claude
            </div>
            <div className="mt-1 text-xs text-gray-400">Day 3 of 14</div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          © 2026 NammuruAI · Not affiliated with BBMP · Civic tech for public good
        </div>
      </footer>
    </main>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function StepCard({
  icon,
  emoji,
  title,
  body,
}: {
  icon: React.ReactNode
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <span className="text-[#0F6E56]">{icon}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{body}</p>
    </div>
  )
}

function Pill({
  tone,
  children,
}: {
  tone: 'teal' | 'amber' | 'red'
  children: React.ReactNode
}) {
  const cls =
    tone === 'teal'
      ? 'bg-[#0F6E56]/10 text-[#0F6E56]'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  )
}

function OutlinePill({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 text-sm text-white">
      {icon}
      {children}
    </span>
  )
}

function TriageCard({
  tone,
  badge,
  sla,
  issues,
  icon,
}: {
  tone: 'red' | 'amber' | 'teal'
  badge: string
  sla: string
  issues: string
  icon: React.ReactNode
}) {
  const borderCls =
    tone === 'red'
      ? 'border-l-red-500'
      : tone === 'amber'
      ? 'border-l-amber-500'
      : 'border-l-[#0F6E56]'
  const badgeCls =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'amber'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-[#0F6E56]/10 text-[#0F6E56]'
  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 ${borderCls} bg-white p-6 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeCls}`}>
          {badge}
        </span>
        {icon}
      </div>
      <div className="mt-4 text-sm font-semibold text-gray-900">{sla}</div>
      <p className="mt-2 text-sm text-gray-600">{issues}</p>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-[#0F6E56] sm:text-5xl">{value}</div>
      <div className="mt-2 text-xs text-white/80 sm:text-sm">{label}</div>
    </div>
  )
}
