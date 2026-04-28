'use client'

import Link from 'next/link'
import { tokens } from '@/lib/design-tokens'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['Capture', 'Verify', 'Compose', 'Amplify'] as const

interface AppShellProps {
  children: React.ReactNode
  currentStep: Step
  navRight?: React.ReactNode
}

export function AppShell({ children, currentStep, navRight }: AppShellProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .card-enter { animation: fadeInUp 0.4s ease-out both; }

        .btn-teal-glow { transition: box-shadow 0.2s ease, background 0.2s ease; }
        .btn-teal-glow:hover { box-shadow: 0 0 24px rgba(15,110,86,0.5); background: ${tokens.colors.tealLight} !important; }

        .btn-outline-teal { transition: background 0.2s ease; }
        .btn-outline-teal:hover { background: rgba(15,110,86,0.08) !important; }

        .btn-ghost-teal { transition: text-decoration 0.2s ease; }
        .btn-ghost-teal:hover { text-decoration: underline; }

        .spinner-teal {
          width: 36px; height: 36px;
          border: 3px solid rgba(15,110,86,0.2);
          border-top-color: ${tokens.colors.teal};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .spinner-teal-sm {
          width: 16px; height: 16px;
          border: 2px solid rgba(15,110,86,0.2);
          border-top-color: ${tokens.colors.teal};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        input[type="checkbox"]:checked { accent-color: ${tokens.colors.teal}; }
      `}</style>

      <div style={{ minHeight: '100vh', background: tokens.colors.dark, color: tokens.colors.textPrimary, fontFamily: tokens.fonts.sans }}>
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          backdropFilter: 'blur(12px)',
          background: 'rgba(8,15,12,0.88)',
          borderBottom: '1px solid rgba(15,110,86,0.2)',
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontFamily: tokens.fonts.serif, color: tokens.colors.teal, fontSize: '1.15rem', fontWeight: 700 }}>NammuruAI</div>
              <div style={{ color: tokens.colors.textMuted, fontSize: '0.6rem', letterSpacing: '0.15em' }}>ನಮ್ಮ ಊರು</div>
            </Link>
            {navRight}
          </div>
        </nav>

        <main>
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.75rem 1rem 4rem' }}>
            <StepPills active={currentStep} />
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

function StepPills({ active }: { active: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: '2px' }}>
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const isDone = n < active
        const isActive = n === active
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              fontFamily: tokens.fonts.sans,
              background: isDone ? tokens.colors.teal : 'transparent',
              border: isDone ? 'none' : isActive ? `2px solid ${tokens.colors.teal}` : '1px solid rgba(138,158,150,0.25)',
              color: isDone ? 'white' : isActive ? tokens.colors.teal : tokens.colors.textMuted,
              opacity: !isDone && !isActive ? 0.5 : 1,
              boxShadow: isActive ? '0 0 8px rgba(15,110,86,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              <span style={{ fontFamily: tokens.fonts.mono, fontSize: '0.65rem' }}>{n}.</span>
              <span>{label}</span>
              {isDone && <span style={{ fontSize: '0.7rem' }}>✓</span>}
              {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tokens.colors.teal, display: 'inline-block', flexShrink: 0 }} />}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ width: '14px', height: '1px', background: 'rgba(15,110,86,0.25)', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
