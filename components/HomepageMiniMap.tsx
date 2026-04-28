'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BENGALURU_BOUNDS } from '@/lib/ward-aliases';

const MiniMapInner = dynamic(
  () => import('./MiniMapInner'),
  { ssr: false }
);

interface Report {
  id: string;
  lat: number;
  lng: number;
  triage_level: number;
}

export default function HomepageMiniMap() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetch('/api/map-data')
      .then(r => r.json())
      .then(data => {
        const incoming = (data.reports ?? []) as Report[];
        setReports(incoming.slice(0, 50));
      })
      .catch(() => {/* silent */});
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MiniMapInner
        lat={12.9716}
        lng={77.5946}
        zoom={11}
        height="100%"
        interactive={true}
        scrollWheelZoom={false}
        showAttribution={false}
        nearbyReports={reports}
        showCenterPin={false}
        maxBounds={BENGALURU_BOUNDS}
      />

      {/* Live indicator */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(8,15,12,0.85)',
        backdropFilter: 'blur(8px)',
        color: '#0F6E56',
        padding: '6px 12px', borderRadius: 20,
        fontFamily: 'JetBrains Mono', fontSize: 11,
        fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 6,
        zIndex: 500,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#0F6E56',
          animation: 'pulse 2s infinite',
        }} />
        LIVE · {reports.length} reports
      </div>
    </div>
  );
}
