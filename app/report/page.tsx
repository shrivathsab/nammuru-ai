import Link from 'next/link'
import { Camera, Sparkles, Mail, X } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Camera,
    title: 'Capture Photo',
    description: 'Take a photo of the civic issue directly from your phone.',
    badge: 'Camera integration — Day 2',
    badgeStyle: 'bg-amber-100 text-amber-700',
    active: true,
  },
  {
    number: 2,
    icon: Sparkles,
    title: 'AI Classifies',
    description: 'Issue type, ward & severity auto-detected from the image.',
    badge: 'Coming soon',
    badgeStyle: 'bg-gray-100 text-gray-500',
    active: false,
  },
  {
    number: 3,
    icon: Mail,
    title: 'Draft Email',
    description: 'AI composes a councillor email on your behalf.',
    badge: 'Coming soon',
    badgeStyle: 'bg-gray-100 text-gray-500',
    active: false,
  },
  {
    number: 4,
    icon: X,
    title: 'Generate Tweet',
    description: 'Thread crafted for social amplification.',
    badge: 'Coming soon',
    badgeStyle: 'bg-gray-100 text-gray-500',
    active: false,
  },
]

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold" style={{ color: '#0F6E56' }}>
              NammuruAI
            </span>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              ನಮ್ಮ ಊರಿಗಾಗಿ AI — Civic accountability for Bengaluru
            </p>
          </Link>
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Report a Civic Issue
            </h1>
            <p className="mt-2 text-gray-500">
              Live camera and AI classification launching tomorrow
            </p>
          </div>

          {/* Step cards */}
          <div className="space-y-4">
            {steps.map(({ number, icon: Icon, title, description, badge, badgeStyle, active }) => (
              <div
                key={number}
                className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 transition-opacity${active ? '' : ' opacity-60'}`}
              >
                {/* Step number circle */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={active
                    ? { backgroundColor: '#0F6E56', color: '#fff' }
                    : { backgroundColor: '#e5e7eb', color: '#9ca3af' }}
                >
                  {number}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Icon
                      size={16}
                      className={active ? '' : 'text-gray-400'}
                      style={active ? { color: '#0F6E56' } : {}}
                    />
                    <span className="font-semibold text-gray-900">{title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeStyle}`}>
                      {badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Back to Home */}
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm font-medium hover:underline"
              style={{ color: '#0F6E56' }}
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </main>

    </div>
  )
}
