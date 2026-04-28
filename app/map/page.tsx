'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 120px)', background: '#080f0c',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 16px',
          border: '3px solid rgba(15,110,86,0.2)',
          borderTop: '3px solid #0F6E56',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#8a9e96', fontFamily: 'DM Sans', fontSize: 14 }}>
          Loading Bengaluru ward map...
        </p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div style={{ background: '#080f0c', minHeight: '100vh' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(8,15,12,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(15,110,86,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Playfair Display', color: '#0F6E56', fontSize: 18 }}>
              NammuruAI
            </span>
          </Link>
          <Link href="/" style={{
            color: '#8a9e96', fontSize: 13, fontFamily: 'DM Sans',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Home
          </Link>
        </div>
        <Link href="/report" style={{
          background: '#0F6E56', color: 'white', padding: '8px 20px',
          borderRadius: 40, fontFamily: 'DM Sans', fontSize: 13,
          fontWeight: 600, textDecoration: 'none',
        }}>
          File a Report →
        </Link>
      </nav>

      <div style={{ paddingTop: 56 }}>
        <MapView />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes civicPulse {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(4); opacity: 0;   }
        }
        .civic-pulse-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          animation: civicPulse 2s ease-out infinite;
          pointer-events: none;
        }
        .leaflet-popup-content-wrapper {
          background: #0e1a15 !important;
          border: 1px solid rgba(15,110,86,0.4) !important;
          border-radius: 12px !important;
          color: #f0ede8 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip { background: #0e1a15 !important; }
        .leaflet-popup-close-button { color: #8a9e96 !important; }
        .leaflet-control-attribution {
          background: rgba(8,15,12,0.8) !important;
          color: #8a9e96 !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: #0F6E56 !important; }
      `}</style>
    </div>
  );
}
