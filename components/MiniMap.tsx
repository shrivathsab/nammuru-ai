'use client';
import dynamic from 'next/dynamic';
import type { LatLngBoundsExpression } from 'leaflet';

export interface MiniMapProps {
  lat: number;
  lng: number;
  wardName?: string;
  nearbyReports?: Array<{
    id: string;
    lat: number;
    lng: number;
    triage_level: number;
  }>;
  zoom?: number;
  height?: string;
  animatePin?: boolean;
  showAttribution?: boolean;
  interactive?: boolean;
  scrollWheelZoom?: boolean;
  showCenterPin?: boolean;
  maxBounds?: LatLngBoundsExpression;
}

const MiniMapInner = dynamic(
  () => import('./MiniMapInner'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '240px',
        background: '#0e1a15',
        borderRadius: 12,
        border: '1px solid rgba(15,110,86,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(15,110,86,0.2)',
          borderTop: '3px solid #0F6E56',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
);

export default function MiniMap(props: MiniMapProps) {
  return <MiniMapInner {...props} />;
}
