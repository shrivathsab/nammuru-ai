import Link from 'next/link'
import { MapPin, FileText, Building2, Mail, Zap } from 'lucide-react'
import { getServerClient } from '@/lib/supabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageStats {
  total_reports: number
  emails_sent: number
  recent_reports: number
  recent_activity: {
    ward_name: string
    issue_type: string
    created_at: string
  }[]
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchStats(): Promise<PageStats> {
  const defaults: PageStats = {
    total_reports: 0,
    emails_sent: 0,
    recent_reports: 0,
    recent_activity: [],
  }

  try {
    const supabase = getServerClient()
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const [totalRes, emailsRes, recentRes, activityRes] = await Promise.all([
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .not('email_draft', 'is', null),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('reports')
        .select('ward_name, issue_type, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    if (
      totalRes.error ||
      emailsRes.error ||
      recentRes.error ||
      activityRes.error
    ) {
      return defaults
    }

    return {
      total_reports: totalRes.count ?? 0,
      emails_sent: emailsRes.count ?? 0,
      recent_reports: recentRes.count ?? 0,
      recent_activity: activityRes.data ?? [],
    }
  } catch {
    return defaults
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const stats = await fetchStats()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold" style={{ color: '#0F6E56' }}>
              NammuruAI
            </span>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              ನಮ್ಮ ಊರಿಗಾಗಿ AI — Civic accountability for Bengaluru
            </p>
          </div>
          <Link
            href="/report"
            className="text-sm font-medium text-white rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0F6E56' }}
          >
            Report an Issue
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
            Your city.{' '}
            <span style={{ color: '#0F6E56' }}>Your voice.</span>{' '}
            AI&#8209;powered.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mt-4">
            Transforming civic complaints into official action using artificial
            intelligence.
          </p>
          <Link
            href="/report"
            className="inline-block mt-8 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-transform hover:scale-105"
            style={{ backgroundColor: '#0F6E56' }}
          >
            Report Now →
          </Link>
        </div>
      </section>

      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText size={18} style={{ color: '#0F6E56' }} />}
            value={stats.total_reports}
            label="Total Reports"
          />
          <StatCard
            icon={<Building2 size={18} style={{ color: '#0F6E56' }} />}
            value={5}
            label="Wards Covered"
          />
          <StatCard
            icon={<Mail size={18} style={{ color: '#0F6E56' }} />}
            value={stats.emails_sent}
            label="Emails Sent"
          />
          <StatCard
            icon={<Zap size={18} style={{ color: '#0F6E56' }} />}
            value={stats.recent_reports}
            label="Active This Week"
          />
        </div>
      </section>

      {/* ── Map + Feed ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Heatmap placeholder */}
          <div
            className="rounded-xl p-6 flex flex-col items-center justify-center text-center"
            style={{
              border: '2px dashed #0F6E56',
              minHeight: '300px',
            }}
          >
            <MapPin size={32} style={{ color: '#0F6E56' }} />
            <h3 className="mt-3 text-lg font-semibold text-gray-800">
              Live Issue Map
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-xs">
              Coming soon — real-time heatmap of Bengaluru civic issues
            </p>
          </div>

          {/* Activity feed */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Recent Reports
              </h3>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: '#0F6E56' }}
              />
            </div>

            {stats.recent_activity.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No reports yet — be the first!
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recent_activity.map((item, i) => (
                  <li key={i} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.issue_type}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.ward_name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
                      {timeAgo(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          Built with Claude AI · Open source · #NammuruAI
        </p>
      </footer>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="mb-2">{icon}</div>
      <p className="text-3xl font-bold" style={{ color: '#0F6E56' }}>
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}
