'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MiniMapProps } from './MiniMap';
import { BENGALURU_MIN_ZOOM } from '@/lib/ward-aliases';

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl:       '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl:     '/leaflet/marker-shadow.png',
  });
}

function normalizeWardName(name: string): string {
  return name
    .trim()
    .replace(/\s+Ward$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function triageColor(level: number): string {
  return level === 1 ? '#e53e3e' : level === 2 ? '#d97706' : '#0F6E56';
}

export default function MiniMapInner({
  lat,
  lng,
  wardName,
  nearbyReports = [],
  zoom = 14,
  height = '240px',
  animatePin = false,
  showAttribution = false,
  interactive = false,
  scrollWheelZoom,
  showCenterPin,
  maxBounds,
}: MiniMapProps) {
  const [wardGeoJson, setWardGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!wardName) return;
    fetch('/data/bbmp-wards.geojson')
      .then(r => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        const normTarget = normalizeWardName(wardName);
        const features = geo.features.filter(f => {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const name =
            (props.name_en as string) ??
            (props.Name as string) ??
            (props.WARD_NAME as string) ??
            '';
          return normalizeWardName(name) === normTarget;
        });
        if (features.length > 0) {
          setWardGeoJson({ type: 'FeatureCollection', features });
        }
      })
      .catch(() => {/* silently ignore — map still renders */});
  }, [wardName]);

  return (
    <div style={{
      height,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(15,110,86,0.3)',
      background: '#080f0c',
    }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        minZoom={maxBounds ? BENGALURU_MIN_ZOOM : undefined}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={scrollWheelZoom ?? interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        attributionControl={showAttribution}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© OpenStreetMap © CARTO'
        />

        {wardGeoJson && (
          <GeoJSON
            data={wardGeoJson}
            style={{
              fillColor: '#0F6E56',
              fillOpacity: 0.2,
              color: '#0F6E56',
              weight: 2,
              opacity: 0.8,
            }}
          />
        )}

        {nearbyReports.map(r => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={4}
            pathOptions={{
              fillColor: triageColor(r.triage_level),
              fillOpacity: 0.6,
              color: 'white',
              weight: 1,
            }}
          />
        ))}

        {!animatePin && showCenterPin !== false && (
          <CircleMarker
            center={[lat, lng]}
            radius={10}
            pathOptions={{
              fillColor: '#0F6E56',
              fillOpacity: 0.9,
              color: 'white',
              weight: 2,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
