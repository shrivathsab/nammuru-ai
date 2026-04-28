'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Camera,
  Shield,
  FileText,
  MapPin,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Globe,
  Monitor,
  Menu,
  X,
} from 'lucide-react'

import MiniMap from '@/components/MiniMap'
import { BENGALURU_BOUNDS } from '@/lib/ward-aliases'

const HomepageMiniMap = dynamic(
  () => import('@/components/HomepageMiniMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '100%',
        background: '#0e1a15',
        borderRadius: 16,
        border: '1px solid rgba(15,110,86,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#8a9e96', fontSize: 13 }}>
          Loading live map...
        </span>
      </div>
    ),
  }
)

const TEAL = '#0F6E56'
const TEAL_LIGHT = '#1a9b78'
const DARK = '#080f0c'
const DARK2 = '#0e1a15'
const DARK3 = '#162118'
const CREAM = '#f5f0e8'
const GOLD = '#d4a843'
const RED = '#e53e3e'
const AMBER = '#d97706'
const TEXT_PRIMARY = '#f0ede8'
const TEXT_MUTED = '#8a9e96'

const EMAIL_BODY =
  `Dear Ward Officer,\n\nI write to formally report a High Severity pothole located at HSR Layout, Bengaluru (GPS: 12.9116, 77.6370). This matter is filed under Report ID NMR-20260421-A7F3 via the NammuruAI civic platform and is publicly documented.\n\nUnder BBMP Act 1976 Section 58, your office is legally obligated to maintain roads within your ward jurisdiction...`

// ─── Sub-components ──────────────────────────────────────────────

function ConfidenceBar() {
  const [animate, setAnimate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimate(true) }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', background: TEAL, borderRadius: '2px', width: animate ? '94%' : '0%', transition: animate ? 'width 1.2s ease-out 0.3s' : 'none' }} />
    </div>
  )
}

function CountUpStat({ target, label, active }: { target: number; label: string; active: boolean }) {
  const [count, setCount] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!active || started.current) return
    started.current = true
    const dur = 1500
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target])
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="font-display" style={{ fontSize: '3.5rem', fontWeight: 700, color: TEAL, lineHeight: 1 }}>{count}</div>
      <div style={{ color: TEXT_MUTED, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>{label}</div>
    </div>
  )
}

function StatStatic({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="font-display" style={{ fontSize: '3.5rem', fontWeight: 700, color: TEAL, lineHeight: 1 }}>{value}</div>
      <div style={{ color: TEXT_MUTED, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>{label}</div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────

export default function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [emailInView, setEmailInView] = useState(false)
  const [statsInView, setStatsInView] = useState(false)

  const emailRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)
  const charRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Navbar scroll
  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Email in-view
  useEffect(() => {
    const el = emailRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setEmailInView(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Stats in-view
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsInView(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Typewriter
  useEffect(() => {
    if (!emailInView || typingDone) return
    timerRef.current = setInterval(() => {
      charRef.current += 3
      if (charRef.current >= EMAIL_BODY.length) {
        setTypedText(EMAIL_BODY)
        setTypingDone(true)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setTypedText(EMAIL_BODY.slice(0, charRef.current))
      }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [emailInView, typingDone])

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif !important; }
        .font-mono-jet { font-family: 'JetBrains Mono', monospace !important; }

        /* Reveal */
        .reveal { opacity: 0; transform: translateY(24px); }
        .reveal.visible { animation: fadeInUp 0.65s ease-out forwards; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Hero stagger */
        .h1 { animation: fadeInUp 0.6s ease-out 0ms both; }
        .h2 { animation: fadeInUp 0.6s ease-out 120ms both; }
        .h3 { animation: fadeInUp 0.6s ease-out 240ms both; }
        .h4 { animation: fadeInUp 0.6s ease-out 360ms both; }
        .h5 { animation: fadeInUp 0.6s ease-out 480ms both; }

        /* Mesh drift */
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,40px); } }
        .drift1 { animation: drift1 14s ease-in-out infinite; }
        .drift2 { animation: drift2 17s ease-in-out infinite; }

        /* Pulse */
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
        .pulse { animation: pulse 2s ease-in-out infinite; }

        /* Blink cursor */
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        .blink { animation: blink 1s step-end infinite; }

        /* Bounce */
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        .bounce { animation: bounce 1.6s ease-in-out infinite; }

        /* Arrow pulse */
        @keyframes arrowPulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .arrow-pulse { animation: arrowPulse 1.8s ease-in-out infinite; }

        /* Nav underline */
        .nav-link { position: relative; text-decoration: none; }
        .nav-link::after { content:''; display:block; height:1px; background:${TEAL}; transform:scaleX(0); transform-origin:left; transition:transform 0.3s ease; }
        .nav-link:hover::after { transform:scaleX(1); }

        /* Card hover */
        .card-lift { transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .card-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.25); }

        /* Glow CTA */
        .btn-glow { transition: box-shadow 0.2s ease, background 0.2s ease; }
        .btn-glow:hover { box-shadow: 0 0 22px rgba(15,110,86,0.45); background: ${TEAL_LIGHT} !important; }

        /* White CTA */
        .btn-white { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .btn-white:hover { transform: scale(1.02); box-shadow: 0 8px 32px rgba(0,0,0,0.22); }

        /* Noise overlay */
        .noise::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:0.03; pointer-events:none; }

        /* Responsive helpers */
        .hide-mobile { display: none; }
        .show-mobile { display: block; }
        @media (min-width: 768px) {
          .hide-mobile { display: flex; }
          .show-mobile { display: none; }
        }
        .steps-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 900px) { .steps-grid { grid-template-columns: 1fr auto 1fr auto 1fr; align-items: start; } }
        .step-arrow { display: none; align-items: center; justify-content: center; align-self: center; color: ${TEAL}; font-size: 1.75rem; }
        @media (min-width: 900px) { .step-arrow { display: flex; } }
        .two-col { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 640px) { .two-col { grid-template-columns: 1fr 1fr; } }
        .three-col { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .three-col { grid-template-columns: repeat(3, 1fr); } }
        .four-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
        @media (min-width: 768px) { .four-col { grid-template-columns: repeat(4, 1fr); } }
        .footer-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; text-align: center; }
        @media (min-width: 768px) { .footer-grid { grid-template-columns: repeat(3, 1fr); text-align: left; } }
        .ward-grid { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
        .info-bar { display: flex; flex-direction: column; gap: 0.75rem; }
        @media (min-width: 640px) { .info-bar { flex-direction: row; align-items: center; justify-content: space-between; } }

        /* Footer link hover */
        .footer-link { color: ${TEXT_MUTED}; text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
        .footer-link:hover { color: ${TEAL}; }

        /* City card link hover */
        .city-link { text-decoration: none; font-size: 0.875rem; font-weight: 500; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        .city-link-teal { color: ${TEAL}; }
        .city-link-teal:hover { border-color: ${TEAL}; }
        .city-link-gold { color: ${GOLD}; }
        .city-link-gold:hover { border-color: ${GOLD}; }
      `}</style>

      <main style={{ background: DARK, color: TEXT_PRIMARY, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── NAVBAR ─────────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          backdropFilter: navScrolled ? 'blur(12px)' : 'none',
          background: navScrolled ? 'rgba(8,15,12,0.88)' : 'transparent',
          borderBottom: `1px solid ${navScrolled ? 'rgba(15,110,86,0.2)' : 'transparent'}`,
          transition: 'all 0.3s ease',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <div>
              <div className="font-display" style={{ color: TEAL, fontSize: '1.25rem', fontWeight: 700 }}>NammuruAI</div>
              <div style={{ color: TEXT_MUTED, fontSize: '0.65rem', letterSpacing: '0.15em' }}>ನಮ್ಮ ಊರು</div>
            </div>
            {/* Desktop nav */}
            <div className="hide-mobile" style={{ alignItems: 'center', gap: '2rem' }}>
              <a href="#how-it-works" onClick={scrollToSection('how-it-works')} className="nav-link" style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>How It Works</a>
              <a href="#coverage" className="nav-link" style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>Coverage</a>
              <a href="#about" className="nav-link" style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>About</a>
              <Link href="/map" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(15,110,86,0.1)',
                border: '1px solid rgba(15,110,86,0.4)',
                color: '#0F6E56',
                padding: '8px 16px', borderRadius: 24,
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,110,86,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,110,86,0.1)'; }}>
                📍 Live Map
              </Link>
              <Link href="/report" className="btn-glow" style={{ background: TEAL, color: 'white', padding: '0.5rem 1.25rem', borderRadius: '9999px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                Report an Issue →
              </Link>
            </div>
            {/* Mobile hamburger */}
            <button className="show-mobile" onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: TEXT_PRIMARY, cursor: 'pointer', padding: '0.5rem', display: 'block' }} aria-label="Open menu">
              <Menu size={24} />
            </button>
          </div>
        </nav>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div style={{ position: 'fixed', inset: 0, background: DARK, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
            <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: TEXT_PRIMARY, cursor: 'pointer' }}><X size={24} /></button>
            {[['How It Works', '#how-it-works'], ['Coverage', '#coverage'], ['About', '#about']].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMobileOpen(false)} style={{ color: TEXT_PRIMARY, textDecoration: 'none', fontSize: '1.25rem' }}>{label}</a>
            ))}
            <Link href="/map" onClick={() => setMobileOpen(false)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(15,110,86,0.1)',
              border: '1px solid rgba(15,110,86,0.4)',
              color: '#0F6E56',
              padding: '10px 22px', borderRadius: 24,
              fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500,
              textDecoration: 'none',
            }}>📍 Live Map</Link>
            <Link href="/report" onClick={() => setMobileOpen(false)} style={{ background: TEAL, color: 'white', padding: '0.75rem 2.5rem', borderRadius: '9999px', textDecoration: 'none', fontSize: '1rem', fontWeight: 600 }}>Report an Issue →</Link>
          </div>
        )}

        {/* ── SECTION 1 — HERO ───────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          background: '#080f0c',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          padding: '120px 48px 80px',
          alignItems: 'center',
        }} className="hero-grid">

          {/* LEFT — text + CTAs */}
          <div style={{ maxWidth: 520 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(15,110,86,0.15)',
              border: '1px solid rgba(15,110,86,0.4)',
              padding: '6px 14px', borderRadius: 24,
              color: '#0F6E56', fontSize: 13,
              fontFamily: 'DM Sans', fontWeight: 500,
              marginBottom: 24,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#0F6E56',
                animation: 'pulse 2s infinite',
              }} />
              Bengaluru's first AI civic platform
            </div>

            <h1 style={{
              fontFamily: 'Playfair Display',
              color: '#f0ede8',
              fontSize: '3.25rem',
              lineHeight: 1.15,
              marginBottom: 20,
            }}>
              Report civic issues.<br/>
              <span style={{ color: '#0F6E56', fontStyle: 'italic' }}>
                Make BBMP
              </span>{' '}
              accountable.
            </h1>

            <p style={{
              color: '#8a9e96',
              fontFamily: 'DM Sans',
              fontSize: 17,
              lineHeight: 1.6,
              marginBottom: 32,
            }}>
              Capture a photo. AI verifies, classifies, drafts a formal
              legal letter, and routes to the right BBMP officer — in
              30 seconds. Every report becomes a public record on the
              Bengaluru civic map.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link href="/report" style={{
                background: '#0F6E56', color: 'white',
                padding: '14px 28px', borderRadius: 40,
                fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                File a Report →
              </Link>

              <Link href="/map" style={{
                background: 'transparent', color: '#f0ede8',
                padding: '14px 28px', borderRadius: 40,
                border: '1px solid rgba(15,110,86,0.5)',
                fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                📍 Explore the Map →
              </Link>
            </div>

            <div style={{
              display: 'flex', gap: 16, color: '#8a9e96',
              fontFamily: 'DM Sans', fontSize: 13, flexWrap: 'wrap',
            }}>
              <span>✓ Claude Vision verified</span>
              <span>·</span>
              <span>✓ BBMP Act citations</span>
              <span>·</span>
              <span>✓ 225 wards covered</span>
            </div>
          </div>

          {/* RIGHT — live mini-map */}
          <div style={{
            position: 'relative',
            height: 'min(560px, 70vh)',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(15,110,86,0.3)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}>
            <HomepageMiniMap />

            {/* Floating "Open Full Map" button bottom-right of the map */}
            <Link href="/map" style={{
              position: 'absolute', bottom: 16, right: 16,
              background: 'rgba(8,15,12,0.85)',
              backdropFilter: 'blur(8px)',
              color: '#f0ede8',
              padding: '8px 16px', borderRadius: 24,
              border: '1px solid rgba(15,110,86,0.5)',
              fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              zIndex: 1000,
            }}>
              Open Full Map →
            </Link>
          </div>
        </section>

        {/* Mobile: stack columns */}
        <style>{`
          @media (max-width: 900px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              padding: 100px 20px 60px !important;
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(1.4); }
          }
        `}</style>

        {/* ── SECTION 2 — HOW IT WORKS ───────────────────────────── */}
        <section id="how-it-works" style={{ background: DARK2, padding: '120px 1.5rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ color: GOLD, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>THE PROCESS</div>
              <h2 className="font-display" style={{ fontSize: 'clamp(1.875rem, 4vw, 2.5rem)', fontWeight: 700, color: TEXT_PRIMARY }}>Three steps. Thirty seconds.</h2>
            </div>

            <div className="steps-grid">
              {/* Step 1 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${TEAL}`, borderRadius: '0.75rem', padding: '2rem', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div className="font-mono-jet" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '2rem', fontWeight: 500, color: GOLD, opacity: 0.5 }}>01</div>
                <Camera size={32} style={{ color: TEAL, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Capture the Issue</h3>
                <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.72, marginBottom: '1.5rem' }}>Point your camera at the pothole, garbage pile, or broken infrastructure. GPS auto-detects your ward and zone.</p>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: TEXT_MUTED, opacity: 0.65 }}>capture="environment"</div>
              </div>

              {/* Arrow */}
              <div className="step-arrow arrow-pulse">→</div>

              {/* Step 2 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${TEAL}`, borderRadius: '0.75rem', padding: '2rem', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div className="font-mono-jet" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '2rem', fontWeight: 500, color: GOLD, opacity: 0.5 }}>02</div>
                <Shield size={32} style={{ color: TEAL, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Claude Validates</h3>
                <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.72, marginBottom: '1.5rem' }}>Claude Vision checks authenticity, classifies the issue type, detects private property, and assigns a triage level — all in one API call.</p>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: TEXT_MUTED, opacity: 0.65 }}>claude-haiku-4-5</div>
              </div>

              {/* Arrow */}
              <div className="step-arrow arrow-pulse">→</div>

              {/* Step 3 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${TEAL}`, borderRadius: '0.75rem', padding: '2rem', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div className="font-mono-jet" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '2rem', fontWeight: 500, color: GOLD, opacity: 0.5 }}>03</div>
                <FileText size={32} style={{ color: TEAL, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Legal Letter Generated</h3>
                <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.72, marginBottom: '1.5rem' }}>A formal grievance email citing BBMP Act 1976 is drafted to your ward officer. Copy, paste, send. BBMP has a legal obligation to respond.</p>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: TEXT_MUTED, opacity: 0.65 }}>BBMP Act 1976 §58</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3 — AI VALIDATION GATE ────────────────────── */}
        <section style={{ background: CREAM, padding: '120px 1.5rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ color: TEAL, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>AI VERIFICATION</div>
              <h2 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: '#1a2e28' }}>Every report is verified before it reaches BBMP.</h2>
              <p style={{ marginTop: '1rem', color: '#4a6660', maxWidth: '520px', margin: '1rem auto 0', lineHeight: 1.72 }}>
                Invalid, fake, or private property submissions are rejected automatically. Officers only receive verified reports.
              </p>
            </div>

            <div className="two-col">
              {/* Rejected */}
              <div className="reveal card-lift" style={{ background: 'white', borderLeft: '4px solid #e53e3e', borderTop: '2px solid #e53e3e', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: RED, fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>❌ Rejected</div>
                <div style={{ aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Monitor size={24} style={{ color: '#9ca3af' }} />
                  <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>Screenshot detected</span>
                </div>
                <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.725rem', fontWeight: 600 }}>screenshot</span>
                <div style={{ marginTop: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', color: '#b91c1c', fontSize: '0.8125rem', lineHeight: 1.65 }}>
                  Please submit a direct photo of the issue, not a photo of a screen.
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#9ca3af' }}>No API credits used for invalid submissions</p>
              </div>

              {/* Accepted */}
              <div className="reveal card-lift" style={{ background: 'white', borderLeft: `4px solid ${TEAL}`, borderTop: `2px solid ${TEAL}`, borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: TEAL, fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>✅ Verified</div>
                <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Camera size={24} style={{ color: TEAL }} />
                  <span style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Real outdoor photo</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ background: '#1a2e28', color: 'white', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 600 }}>Pothole</span>
                  <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 600 }}>High Severity</span>
                  <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>URGENT L1</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                    <MapPin size={14} style={{ color: TEAL, flexShrink: 0 }} /> HSR Layout, Bengaluru
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                    <Building2 size={14} style={{ color: TEAL, flexShrink: 0 }} /> HSR Layout Ward · Bommanahalli Zone
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                  <span>AI Confidence</span><span>94%</span>
                </div>
                <ConfidenceBar />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3.5 — WARD ACCOUNTABILITY ──────────────────── */}
        <section id="accountability" style={{
          background: '#0e1a15',
          padding: '100px 24px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{
                color: '#d4a843', fontSize: 12,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: 'JetBrains Mono', marginBottom: 16,
              }}>
                WARD ACCOUNTABILITY
              </p>
              <h2 style={{
                fontFamily: 'Playfair Display',
                color: '#f0ede8',
                fontSize: '2.5rem',
                lineHeight: 1.2,
                marginBottom: 16,
              }}>
                Every report on the map. Forever.
              </h2>
              <p style={{
                color: '#8a9e96', fontFamily: 'DM Sans',
                fontSize: 16, maxWidth: 560, margin: '0 auto',
                lineHeight: 1.6,
              }}>
                Officers see their ward's accountability score update
                in real time. So does everyone else. Reports stay public
                until BBMP responds or escalates.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr',
              gap: 40,
              alignItems: 'center',
            }} className="acc-grid">

              <div style={{
                height: 460,
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid rgba(15,110,86,0.3)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}>
                <MiniMap
                  lat={12.9116}
                  lng={77.6370}
                  zoom={14}
                  wardName="HSR Layout Ward"
                  height="100%"
                  interactive={true}
                  showAttribution={true}
                  maxBounds={BENGALURU_BOUNDS}
                />
              </div>

              <div>
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    color: '#0F6E56', fontFamily: 'JetBrains Mono',
                    fontSize: 11, letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 8,
                  }}>HEALTH SCORE</div>
                  <div style={{
                    fontFamily: 'Playfair Display', fontSize: 56,
                    color: '#d97706', lineHeight: 1, marginBottom: 4,
                    fontWeight: 700,
                  }}>61</div>
                  <div style={{ color: '#8a9e96', fontSize: 13 }}>
                    HSR Layout Ward · Bommanahalli Zone
                  </div>
                </div>

                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  color: '#f0ede8', fontFamily: 'DM Sans',
                  fontSize: 14, lineHeight: 2,
                }}>
                  <li>⚡ <span style={{ color: '#e53e3e' }}>2</span> Urgent open</li>
                  <li>⏱ <span style={{ color: '#d97706' }}>5</span> Medium open</li>
                  <li>✓ <span style={{ color: '#0F6E56' }}>8</span> Resolved this week</li>
                  <li>⚠️ <span style={{ color: '#e53e3e' }}>1</span> Escalated past SLA</li>
                </ul>

                <Link href="/map" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginTop: 28,
                  background: '#0F6E56', color: 'white',
                  padding: '12px 24px', borderRadius: 40,
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Explore the full map →
                </Link>
              </div>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .acc-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </section>

        {/* ── SECTION 4 — EMAIL DRAFT PREVIEW ────────────────────── */}
        <section ref={emailRef} style={{ background: DARK, paddingBottom: '120px', position: 'relative' }}>
          <div style={{ height: '8px', background: `linear-gradient(90deg, ${DARK2}, ${TEAL}, ${DARK2})` }} />
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 1.5rem 0' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ color: GOLD, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>THE OUTPUT</div>
              <h2 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1.15 }}>
                Claude drafts the legal letter.<br />You just hit send.
              </h2>
              <p style={{ marginTop: '1rem', color: TEXT_MUTED, maxWidth: '460px', margin: '1rem auto 0', lineHeight: 1.72 }}>
                Formal. Factual. Statutory references included. No emotional language. Just legal obligation.
              </p>
            </div>

            {/* Email card */}
            <div className="reveal" style={{ background: 'white', borderRadius: '0.875rem', boxShadow: '0 30px 70px rgba(0,0,0,0.45)', maxWidth: '680px', margin: '0 auto 2.5rem', overflow: 'hidden' }}>
              {/* Window bar */}
              <div style={{ background: '#f3f4f6', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                </div>
                <span style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem', color: '#9ca3af' }}>New Message</span>
              </div>

              {/* Headers */}
              {[
                { label: 'TO:', content: <span>Ward Officer, HSR Layout <span className="font-mono-jet" style={{ color: TEAL, fontSize: '0.72rem' }}>&lt;hsrlayout.ward@bbmp.gov.in&gt;</span></span> },
                { label: 'CC:', content: <span className="font-mono-jet" style={{ color: TEAL, fontSize: '0.72rem' }}>grievance@bbmp.gov.in</span> },
              ].map(({ label, content }) => (
                <div key={label} style={{ padding: '0.625rem 1.25rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem', display: 'flex', gap: '0.625rem', color: '#374151' }}>
                  <span style={{ color: '#9ca3af', fontWeight: 600, minWidth: '52px' }}>{label}</span>
                  {content}
                </div>
              ))}
              <div style={{ padding: '0.625rem 1.25rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', gap: '0.625rem', color: '#374151' }}>
                  <span style={{ color: '#9ca3af', fontWeight: 600, minWidth: '52px' }}>SUBJECT:</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>[Report NMR-20260421-A7F3] URGENT: Pothole at HSR Layout — Action Required</span>
                </div>
                <div style={{ marginTop: '0.375rem', paddingLeft: 'calc(52px + 0.625rem)', fontSize: '0.72rem', color: '#9ca3af' }}>
                  ವರದಿ NMR-20260421-A7F3: HSR Layoutದಲ್ಲಿ Pothole — ತಕ್ಷಣ ಕ್ರಮ ಅಗತ್ಯ
                </div>
              </div>
              <div style={{ padding: '0.625rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
                <span className="font-mono-jet" style={{ background: 'rgba(15,110,86,0.1)', color: TEAL, borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.68rem' }}>NMR-20260421-A7F3</span>
              </div>

              {/* Body — typewriter */}
              <div style={{ padding: '1.25rem', minHeight: '200px', position: 'relative' }}>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.82, color: '#374151', whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>
                  {typedText}
                  {!typingDone && (
                    <span className="blink" style={{ display: 'inline-block', width: '2px', height: '1em', background: TEAL, verticalAlign: 'text-bottom', marginLeft: '1px' }} />
                  )}
                </div>
                {typedText.length > 10 && !typingDone && (
                  <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, white, transparent)', pointerEvents: 'none' }} />
                )}
                {typedText.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: typingDone ? TEAL : TEXT_MUTED }}>
                    {!typingDone
                      ? <><span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: TEAL, display: 'inline-block' }} />Claude is drafting...</>
                      : <>✓ Draft complete</>}
                  </div>
                )}
              </div>
            </div>

            {/* Pills */}
            <div className="reveal" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
              {['⚖️ Cites BBMP Act 1976', '📍 GPS coordinates', '🔁 RTI escalation path'].map((p) => (
                <span key={p} style={{ border: `1px solid rgba(15,110,86,0.35)`, background: 'rgba(15,110,86,0.06)', color: TEXT_PRIMARY, borderRadius: '9999px', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5 — TRIAGE SYSTEM ──────────────────────────── */}
        <section style={{ background: DARK2, padding: '120px 1.5rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ color: GOLD, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>URGENCY CLASSIFICATION</div>
              <h2 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: TEXT_PRIMARY }}>AI assigns urgency. Officers know what to fix first.</h2>
            </div>

            <div className="three-col">
              {/* L1 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${RED}`, borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <AlertTriangle size={28} style={{ color: RED }} />
                  <span style={{ background: RED, color: 'white', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.68rem', fontWeight: 700 }}>Level 1</span>
                </div>
                <div className="font-display" style={{ fontSize: '3rem', fontWeight: 700, color: RED, lineHeight: 1 }}>48h</div>
                <div style={{ color: TEXT_MUTED, fontSize: '0.875rem', marginBottom: '1rem' }}>Response Required</div>
                <div style={{ height: '1px', background: 'rgba(229,62,62,0.2)', marginBottom: '1rem' }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {['Potholes — high severity', 'Road encroachments', '10+ cluster reports', 'Safety hazards'].map((i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: RED, flexShrink: 0 }} />{i}
                    </li>
                  ))}
                </ul>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: RED, opacity: 0.8 }}>BBMP Act 1976 §58</div>
              </div>

              {/* L2 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${AMBER}`, borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <Clock size={28} style={{ color: AMBER }} />
                  <span style={{ background: AMBER, color: 'white', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.68rem', fontWeight: 700 }}>Level 2</span>
                </div>
                <div className="font-display" style={{ fontSize: '3rem', fontWeight: 700, color: AMBER, lineHeight: 1 }}>7 days</div>
                <div style={{ color: TEXT_MUTED, fontSize: '0.875rem', marginBottom: '1rem' }}>Response Required</div>
                <div style={{ height: '1px', background: 'rgba(217,119,6,0.2)', marginBottom: '1rem' }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {['Garbage accumulation', 'Broken streetlights', '3–9 cluster reports', 'Medium severity issues'].map((i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: AMBER, flexShrink: 0 }} />{i}
                    </li>
                  ))}
                </ul>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: AMBER, opacity: 0.8 }}>Solid Waste Rules 2016</div>
              </div>

              {/* L3 */}
              <div className="reveal card-lift" style={{ background: DARK3, borderLeft: `4px solid ${TEAL}`, borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <CheckCircle size={28} style={{ color: TEAL }} />
                  <span style={{ background: TEAL, color: 'white', borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.68rem', fontWeight: 700 }}>Level 3</span>
                </div>
                <div className="font-display" style={{ fontSize: '3rem', fontWeight: 700, color: TEAL, lineHeight: 1 }}>30 days</div>
                <div style={{ color: TEXT_MUTED, fontSize: '0.875rem', marginBottom: '1rem' }}>Maintenance Schedule</div>
                <div style={{ height: '1px', background: 'rgba(15,110,86,0.2)', marginBottom: '1rem' }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {['Minor repairs', 'Low severity issues', 'Isolated incidents', 'Routine maintenance'].map((i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: TEAL, flexShrink: 0 }} />{i}
                    </li>
                  ))}
                </ul>
                <div className="font-mono-jet" style={{ fontSize: '0.68rem', color: TEAL, opacity: 0.8 }}>Standard BBMP SLA</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6 — WARD COVERAGE ──────────────────────────── */}
        <section id="coverage" style={{ background: CREAM, padding: '120px 1.5rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ color: TEAL, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>PILOT COVERAGE</div>
              <h2 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, color: '#1a2e28' }}>5 BBMP wards. 198 coming.</h2>
              <p style={{ marginTop: '1rem', color: '#4a6660', maxWidth: '520px', margin: '1rem auto 0', lineHeight: 1.72 }}>
                NammuruAI launched with 5 pilot wards covering central and south Bengaluru. Full ward coverage post-launch.
              </p>
            </div>

            <div className="ward-grid" style={{ marginBottom: '2rem' }}>
              {[
                { name: 'HSR Layout', zone: 'Bommanahalli Zone' },
                { name: 'Koramangala', zone: 'South Zone' },
                { name: 'Indiranagar', zone: 'East Zone' },
                { name: 'Whitefield', zone: 'East Zone' },
                { name: 'Jayanagar', zone: 'South Zone' },
              ].map((w) => (
                <Link
                  key={w.name}
                  href={`/map?ward=${encodeURIComponent(`${w.name} Ward`)}`}
                  className="reveal card-lift"
                  style={{
                    display: 'block',
                    background: 'white',
                    borderLeft: `3px solid ${TEAL}`,
                    borderRadius: '0.5rem',
                    padding: '1rem 1.25rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    minWidth: '180px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ fontWeight: 500, color: '#111827', marginBottom: '0.375rem' }}>{w.name}</div>
                  <span style={{ background: TEAL, color: 'white', borderRadius: '9999px', padding: '0.15rem 0.625rem', fontSize: '0.64rem', fontWeight: 500 }}>{w.zone}</span>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginTop: 8,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEAL, fontSize: 11 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      Active
                    </span>
                    <span style={{ color: TEAL, fontSize: 12 }}>
                      View on map →
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="reveal info-bar" style={{ background: TEAL, borderRadius: '0.75rem', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', fontSize: '0.9rem' }}>
                <Building2 size={18} style={{ flexShrink: 0 }} />
                Outside these wards? Reports are routed to BBMP Central Grievance Cell.
              </div>
              <span style={{ color: GOLD, fontStyle: 'italic', fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap' }}>More cities coming →</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 7 — STATS BAR ──────────────────────────────── */}
        <section ref={statsRef} style={{ background: DARK, padding: '80px 1.5rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="four-col">
              <CountUpStat target={225} label="Wards Monitored" active={statsInView} />
              <CountUpStat target={3} label="Triage Levels" active={statsInView} />
              <StatStatic value="48h" label="L1 Response SLA" />
              <CountUpStat target={1} label="Claude API Call Per Report" active={statsInView} />
            </div>
          </div>
        </section>

        {/* ── SECTION 8 — CITIES CTA ─────────────────────────────── */}
        <section id="about" style={{ background: `linear-gradient(180deg, ${DARK2}, ${DARK})`, padding: '120px 1.5rem' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div className="reveal">
              <h2 className="font-display" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '1rem' }}>
                Built for Bengaluru. Designed for every Indian city.
              </h2>
              <p style={{ color: TEXT_MUTED, maxWidth: '560px', margin: '0 auto 3rem', lineHeight: 1.8 }}>
                NammuruAI is open to city contributions. The ward resolver, triage engine, and email draft system are all city-configurable. Add your city's ward data and statutory references — the AI pipeline works everywhere.
              </p>
            </div>
            <div className="two-col" style={{ textAlign: 'left' }}>
              <div className="reveal card-lift" style={{ background: DARK3, border: `1px solid rgba(15,110,86,0.3)`, borderRadius: '0.75rem', padding: '2rem' }}>
                <Globe size={32} style={{ color: TEAL, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Add Your City</h3>
                <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.72, marginBottom: '1.5rem' }}>Mumbai · Delhi · Chennai · Hyderabad · Pune and beyond. Each city needs ward data + officer emails + statutory references.</p>
                <a href="#" className="city-link city-link-teal">View Contribution Guide →</a>
              </div>
              <div className="reveal card-lift" style={{ background: DARK3, border: `1px solid rgba(212,168,67,0.3)`, borderRadius: '0.75rem', padding: '2rem' }}>
                <MapPin size={32} style={{ color: GOLD, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: '0.625rem' }}>Request Coverage</h3>
                <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.72, marginBottom: '1.5rem' }}>Not in Bengaluru? Submit a city request. We prioritize cities with the most requests.</p>
                <a href="#" className="city-link city-link-gold">Request Your City →</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 9 — FINAL CTA ──────────────────────────────── */}
        <section style={{
          background: '#0F6E56',
          padding: '100px 24px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'Playfair Display',
              color: 'white',
              fontSize: '2.5rem',
              lineHeight: 1.2,
              marginBottom: 16,
            }}>
              See a civic issue?<br />
              Or curious about your ward?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'DM Sans',
              fontSize: 17,
              marginBottom: 36,
            }}>
              File a report in 30 seconds. Or browse the live map
              to see what&apos;s happening across Bengaluru.
            </p>

            <div style={{
              display: 'flex', gap: 12, justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Link href="/report" style={{
                background: 'white', color: '#0F6E56',
                padding: '16px 32px', borderRadius: 40,
                fontFamily: 'DM Sans', fontSize: 16, fontWeight: 700,
                textDecoration: 'none',
              }}>
                File a Report →
              </Link>

              <Link href="/map" style={{
                background: 'transparent', color: 'white',
                padding: '16px 32px', borderRadius: 40,
                border: '2px solid white',
                fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600,
                textDecoration: 'none',
              }}>
                📍 Browse Live Map →
              </Link>
            </div>

            <div style={{
              display: 'flex', gap: 16, justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)', marginTop: 24,
              fontFamily: 'DM Sans', fontSize: 13, flexWrap: 'wrap',
            }}>
              <span>🔒 No data sold</span>
              <span>·</span>
              <span>⚡ Powered by Claude</span>
              <span>·</span>
              <span>🏛️ Formal legal letters</span>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <footer style={{ background: DARK, borderTop: `1px solid rgba(15,110,86,0.18)`, padding: '4rem 1.5rem 2rem' }}>
          <div className="footer-grid" style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '3rem' }}>
            <div>
              <div className="font-display" style={{ color: TEAL, fontSize: '1.1rem', fontWeight: 700 }}>NammuruAI</div>
              <div style={{ color: TEXT_MUTED, fontSize: '0.72rem', marginBottom: '0.5rem' }}>ನಮ್ಮ ಊರು</div>
              <p style={{ color: TEXT_MUTED, fontSize: '0.8125rem', marginTop: '0.5rem' }}>Built for Bengaluru citizens.</p>
              <p style={{ color: GOLD, fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>Day 3 of 14 — building in public</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/report" className="footer-link">Report an Issue</Link>
              <a href="#how-it-works" onClick={scrollToSection('how-it-works')} className="footer-link">How It Works</a>
              <a href="#coverage" className="footer-link">Ward Coverage</a>
              <Link href="/about" className="footer-link">About NammuruAI</Link>
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>Built with</span>
                <span style={{ background: 'rgba(15,110,86,0.15)', color: TEAL, borderRadius: '9999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 500 }}>Claude AI by Anthropic</span>
              </div>
              <div className="font-mono-jet" style={{ color: TEXT_MUTED, fontSize: '0.68rem' }}>Next.js · Supabase · Tailwind CSS</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid rgba(15,110,86,0.1)`, paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.72rem', color: TEXT_MUTED, maxWidth: '1200px', margin: '0 auto' }}>
            © 2026 NammuruAI · Not affiliated with BBMP · Civic technology for public good
          </div>
        </footer>
      </main>
    </>
  )
}
