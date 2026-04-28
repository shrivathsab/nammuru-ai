import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ExternalLink,
  MapPin,
  Share2,
  Shield,
  X as XIcon,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

import MiniMap from '@/components/MiniMap'
import { CopyButton } from '@/components/ui/CopyButton'
import { LocationBlock } from '@/components/ui/LocationBlock'
import { ReportIdBadge } from '@/components/ui/ReportIdBadge'
import { StatusPill } from '@/components/ui/StatusPill'
import { TriageBadge } from '@/components/ui/TriageBadge'
import { reportUrl, reportDisplayUrl } from '@/lib/config'
import { tokens } from '@/lib/design-tokens'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEAL = tokens.colors.teal
const DARK = tokens.colors.dark
const DARK2 = tokens.colors.dark2
const DARK3 = tokens.colors.dark3
const GOLD = tokens.colors.gold
const AMBER = tokens.colors.amber
const TEXT_PRIMARY = tokens.colors.textPrimary
const TEXT_MUTED = tokens.colors.textMuted

interface ReportRow {
  id: string
  created_at: string
  report_id_human: string | null
  issue_type: string
  severity: 'low' | 'medium' | 'high'
  description: string | null
  status: string
  lat: number
  lng: number
  ward_name: string
  locality_name: string | null
  pincode: string | null
  nearest_landmark: string | null
  triage_level: number | null
  cluster_count: number | null
  tweet_primary: string | null
  ward_zone?: string | null
  road?: string | null
  image_url?: string | null
}

interface PageParams {
  params: Promise<{ report_id: string }>
}

async function fetchReport(reportId: string): Promise<ReportRow | null> {
  try {
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('report_id_human', reportId)
      .maybeSingle()

    console.log('[PublicReport] id:', reportId)
    console.log('[PublicReport] data:', JSON.stringify(report))
    console.log('[PublicReport] error:', JSON.stringify(error))
    console.log('[PublicReport] url:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[PublicReport] key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (error || !report) return null
    return report as unknown as ReportRow
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { report_id } = await params
  const report = await fetchReport(report_id)

  if (!report) {
    return {
      title: `Report ${report_id} — NammuruAI`,
      description: 'Report not found on NammuruAI.',
    }
  }

  const locality = report.locality_name ?? report.ward_name
  const triage = report.triage_level ?? 3

  return {
    title: `Report ${report_id} — NammuruAI`,
    description: `${report.issue_type} at ${locality}, Bengaluru. Triage: Level ${triage}. Filed via NammuruAI.`,
    openGraph: {
      title: `[${report_id}] ${report.issue_type} at ${locality}`,
      description: `AI-verified civic report. Triage Level ${triage}. Status: ${report.status}.`,
      images: [`/api/og?id=${report_id}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?id=${report_id}`],
    },
  }
}

function formatFiledDate(iso: string): { absolute: string; relative: string } {
  const d = new Date(iso)
  const absolute = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  let relative: string
  if (diffMin < 1) relative = 'just now'
  else if (diffMin < 60) relative = `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  else if (diffHr < 24) relative = `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  else if (diffDay < 30) relative = `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  else relative = absolute

  return { absolute, relative }
}

function SeverityPill({ severity }: { severity: string }) {
  const s = severity.toLowerCase()
  const cfg =
    s === 'high'
      ? { bg: 'rgba(229,62,62,0.12)', color: tokens.colors.red, label: 'High Severity' }
      : s === 'medium'
        ? { bg: 'rgba(217,119,6,0.12)', color: AMBER, label: 'Medium Severity' }
        : { bg: 'rgba(15,110,86,0.12)', color: TEAL, label: 'Low Severity' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
      fontFamily: tokens.fonts.mono,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {cfg.label}
    </span>
  )
}

function TopBar() {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
      background: 'rgba(8,15,12,0.88)',
      borderBottom: `1px solid rgba(15,110,86,0.2)`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: tokens.fonts.serif, color: TEAL, fontSize: '1.25rem', fontWeight: 700 }}>
            NammuruAI
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: '0.65rem', letterSpacing: '0.15em' }}>
            ನಮ್ಮ ಊರು
          </div>
        </Link>
        <Link
          href="/report"
          style={{
            background: TEAL,
            color: 'white',
            padding: '0.5rem 1.25rem',
            borderRadius: '9999px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: tokens.fonts.sans,
          }}
        >
          File a Report →
        </Link>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{
      background: DARK,
      borderTop: `1px solid rgba(15,110,86,0.18)`,
      padding: '3rem 1.5rem 2rem',
      marginTop: '4rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: tokens.fonts.serif, color: TEAL, fontSize: '1.1rem', fontWeight: 700 }}>
          NammuruAI
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: '0.72rem', marginBottom: '0.75rem' }}>
          ನಮ್ಮ ಊರು
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>
          © 2026 NammuruAI · Not affiliated with BBMP · Civic technology for public good
        </p>
      </div>
    </footer>
  )
}

function NotFoundCard({ reportId }: { reportId: string }) {
  return (
    <main style={{ background: DARK, color: TEXT_PRIMARY, minHeight: '100vh', fontFamily: tokens.fonts.sans }}>
      <TopBar />
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{
          background: DARK2,
          border: `1px solid rgba(15,110,86,0.2)`,
          borderRadius: '0.875rem',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          maxWidth: '440px',
          width: '100%',
        }}>
          <h1 style={{
            fontFamily: tokens.fonts.serif,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: TEXT_PRIMARY,
            marginBottom: '0.75rem',
          }}>
            Report not found
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The report ID <span style={{ fontFamily: tokens.fonts.mono, color: TEAL }}>{reportId}</span> may be incorrect.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: TEAL,
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </main>
  )
}

export default async function PublicReportPage({ params }: PageParams) {
  const { report_id } = await params
  const report = await fetchReport(report_id)

  if (!report) {
    return <NotFoundCard reportId={report_id} />
  }

  const displayReportId = report.report_id_human ?? report_id
  const { absolute, relative } = formatFiledDate(report.created_at)
  const triageLevel = (report.triage_level ?? 3) as 1 | 2 | 3
  const clusterCount = report.cluster_count ?? 0
  const publicUrl = reportDisplayUrl(displayReportId)
  const fullUrl = reportUrl(displayReportId)
  const mapsUrl = `https://maps.google.com/?q=${report.lat},${report.lng}`

  const isResolved = report.status === 'resolved'

  return (
    <main style={{ background: DARK, color: TEXT_PRIMARY, minHeight: '100vh', fontFamily: tokens.fonts.sans }}>
      <TopBar />

      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '2rem 1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>

        {/* HEADER CARD */}
        <section style={{
          background: DARK2,
          borderLeft: `4px solid ${TEAL}`,
          borderRadius: '0.875rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <ReportIdBadge id={displayReportId} />
            {isResolved ? (
              <StatusPill status="valid" label="✓ Resolved" />
            ) : (
              <StatusPill status="warning" label="Open" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: tokens.fonts.serif,
              fontSize: '1.5rem',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              margin: 0,
              lineHeight: 1.2,
            }}>
              {report.issue_type}
            </h1>
            <TriageBadge level={triageLevel} />
          </div>

          <div style={{
            fontFamily: tokens.fonts.sans,
            color: TEXT_MUTED,
            fontSize: '0.8rem',
          }}>
            Filed {absolute} · {relative}
          </div>
        </section>

        {report.image_url && (
          <div className="mt-4 rounded-xl overflow-hidden"
               style={{ border: '1px solid rgba(15,110,86,0.3)' }}>
            <img
              src={report.image_url}
              alt={`Photo of ${report.issue_type} at ${report.locality_name}`}
              className="w-full object-cover"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {/* LOCATION CARD */}
        <section style={{
          background: DARK2,
          borderRadius: '0.875rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} style={{ color: TEAL }} />
            <span style={{
              fontFamily: tokens.fonts.sans,
              color: TEXT_PRIMARY,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              Location
            </span>
          </div>

          <LocationBlock
            locality={report.locality_name ?? undefined}
            pincode={report.pincode ?? undefined}
            landmark={report.nearest_landmark ?? undefined}
            wardName={report.ward_name}
            zone={report.ward_zone ?? undefined}
          />

          <div style={{
            fontFamily: tokens.fonts.mono,
            color: TEXT_MUTED,
            fontSize: '0.72rem',
          }}>
            {report.lat.toFixed(6)}, {report.lng.toFixed(6)}
          </div>

          <div style={{ marginTop: 16 }}>
            <MiniMap
              lat={report.lat}
              lng={report.lng}
              wardName={report.ward_name}
              zoom={15}
              height="260px"
              showAttribution
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 8, fontSize: 12, fontFamily: tokens.fonts.sans,
            }}>
              <a href={mapsUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 style={{ color: TEAL, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Open in Google Maps <ExternalLink size={12} />
              </a>
              <a href={`/map?focus=${displayReportId}`}
                 style={{ color: TEAL, textDecoration: 'none' }}>
                See on live map →
              </a>
            </div>
          </div>
        </section>

        {/* CLASSIFICATION CARD */}
        <section style={{
          background: DARK2,
          borderRadius: '0.875rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} style={{ color: TEAL }} />
            <span style={{
              fontFamily: tokens.fonts.sans,
              color: TEXT_PRIMARY,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              AI Classification
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <SeverityPill severity={report.severity} />
            <TriageBadge level={triageLevel} />
          </div>

          {report.description && (
            <p style={{
              background: DARK3,
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: TEXT_PRIMARY,
              fontFamily: tokens.fonts.sans,
              fontStyle: 'italic',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {report.description}
            </p>
          )}

          {clusterCount > 1 && (
            <div style={{
              background: 'rgba(212,168,67,0.08)',
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: '0.375rem',
              padding: '0.625rem 0.875rem',
              color: TEXT_PRIMARY,
              fontSize: '0.82rem',
              fontFamily: tokens.fonts.sans,
            }}>
              {clusterCount} citizens reported this location
            </div>
          )}
        </section>

        {/* TWEET CARD */}
        {report.tweet_primary && (
          <section style={{
            background: DARK2,
            borderRadius: '0.875rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XIcon size={16} style={{ color: TEAL }} />
              <span style={{
                fontFamily: tokens.fonts.sans,
                color: TEXT_PRIMARY,
                fontSize: '0.9rem',
                fontWeight: 500,
              }}>
                Public Tweet
              </span>
            </div>

            <p style={{
              color: TEXT_PRIMARY,
              fontFamily: tokens.fonts.sans,
              fontSize: '0.9rem',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}>
              {report.tweet_primary}
            </p>

            <div>
              <CopyButton text={report.tweet_primary} label="Copy Tweet" variant="teal-outline" />
            </div>
          </section>
        )}

        {/* SHARE SECTION */}
        <section style={{
          background: DARK2,
          border: `1px solid rgba(212,168,67,0.35)`,
          borderRadius: '0.875rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={16} style={{ color: GOLD }} />
            <span style={{
              fontFamily: tokens.fonts.sans,
              color: TEXT_PRIMARY,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              Share This Report
            </span>
          </div>

          <div style={{
            background: DARK3,
            borderRadius: '0.5rem',
            padding: '0.625rem 0.875rem',
            fontFamily: tokens.fonts.mono,
            fontSize: '0.82rem',
            color: TEAL,
            userSelect: 'all',
            wordBreak: 'break-all',
            border: `1px solid rgba(15,110,86,0.2)`,
          }}>
            {publicUrl}
          </div>

          <div>
            <CopyButton text={fullUrl} label="Copy Link" variant="gold-solid" />
          </div>

          <p style={{
            fontSize: '0.75rem',
            color: TEXT_MUTED,
            margin: 0,
            fontFamily: tokens.fonts.sans,
          }}>
            This report is publicly documented and permanently indexed.
          </p>
        </section>
      </div>

      <Footer />
    </main>
  )
}
