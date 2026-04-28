'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReportStoryPanel from './ReportStoryPanel';
import { GEOJSON_TO_SUPABASE, BENGALURU_BOUNDS, BENGALURU_MIN_ZOOM } from '@/lib/ward-aliases';

function FocusHandler({
  reports,
  markerRefs,
  onFocusReport,
}: {
  reports: Report[];
  markerRefs: React.MutableRefObject<Map<string, L.CircleMarker>>;
  onFocusReport: (r: Report) => void;
}) {
  const map = useMap();
  const searchParams = useSearchParams();
  const focus = searchParams?.get('focus') ?? null;
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focus || reports.length === 0) return;
    if (appliedRef.current === focus) return;
    const target = reports.find(r => r.report_id_human === focus);
    if (!target) return;
    appliedRef.current = focus;
    map.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
    const marker = markerRefs.current.get(focus);
    if (marker) {
      setTimeout(() => marker.openTooltip(), 800);
    }
    setTimeout(() => onFocusReport(target), 1200);
  }, [focus, reports, map, markerRefs, onFocusReport]);

  return null;
}

function WardFocusHandler({
  geoJson,
  wardStats,
  findWardStat,
  onFocusWard,
}: {
  geoJson: GeoJSON.FeatureCollection | null;
  wardStats: WardStat[];
  findWardStat: (rawName: string) => WardStat | undefined;
  onFocusWard: (w: WardStat) => void;
}) {
  const map = useMap();
  const searchParams = useSearchParams();
  const wardParam = searchParams?.get('ward') ?? null;
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wardParam || !geoJson || wardStats.length === 0) return;
    if (appliedRef.current === wardParam) return;

    const target = normalizeWardName(wardParam);
    const feature = geoJson.features.find(f => {
      const name = getWardName((f.properties ?? {}) as Record<string, unknown>);
      return normalizeWardName(name) === target;
    });
    if (!feature) return;

    appliedRef.current = wardParam;

    const layer = L.geoJSON(feature);
    const center = layer.getBounds().getCenter();
    map.flyTo([center.lat, center.lng], 14, { duration: 1.2 });

    const wardName = getWardName((feature.properties ?? {}) as Record<string, unknown>);
    const stat = findWardStat(wardName);
    setTimeout(() => {
      if (stat) onFocusWard(stat);
      else onFocusWard({
        ward_name: wardName, ward_zone: '',
        health_score: 100, open_l1: 0, open_l2: 0, open_l3: 0,
        escalated: 0, resolved_last_7d: 0, total_open: 0, top_issue: '',
      });
    }, 1200);
  }, [wardParam, geoJson, wardStats, map, findWardStat, onFocusWard]);

  return null;
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface Report {
  id: string;
  report_id_human: string;
  lat: number;
  lng: number;
  ward_name: string;
  issue_type: string;
  severity: string;
  triage_level: number;
  status: string;
  created_at: string;
  locality_name: string | null;
  description: string | null;
  image_url: string | null;
  forwarded_channels: Array<{ channel: string; at: string }> | null;
  cluster_count: number;
}

interface WardStat {
  ward_name: string;
  ward_zone: string;
  health_score: number;
  open_l1: number;
  open_l2: number;
  open_l3: number;
  escalated: number;
  resolved_last_7d: number;
  total_open: number;
  top_issue: string;
}

function wardColor(score: number): string {
  if (score >= 90) return '#0F6E56';
  if (score >= 70) return '#1a9b78';
  if (score >= 50) return '#d97706';
  if (score >= 30) return '#ea580c';
  return '#e53e3e';
}

function triageColor(level: number): string {
  return level === 1 ? '#e53e3e' : level === 2 ? '#d97706' : '#0F6E56';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getWardName(props: Record<string, unknown>): string {
  return (
    (props.name_en as string) ??
    (props.Name as string) ??
    (props.WARD_NAME as string) ??
    (props.ward_name as string) ??
    (props.KGISWardNa as string) ??
    'Unknown Ward'
  );
}

function normalizeWardName(name: string): string {
  return name
    .trim()
    .replace(/\s+Ward$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export default function MapView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [wardStats, setWardStats] = useState<WardStat[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardStat | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [layers, setLayers] = useState({ heat: false, resolved: false, escalated: true });
  const [loading, setLoading] = useState(true);
  const [wardCount, setWardCount] = useState(0);
  const markerRefs = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch('/api/map-data').then(r => r.json()),
      fetch('/data/bbmp-wards.geojson').then(r => r.json()),
    ]).then(([data, geo]) => {
      setReports(data.reports ?? []);
      setWardStats(data.wardStats ?? []);
      setGeoJson(geo);
      setWardCount(geo?.features?.length ?? 0);
      setLoading(false);
    }).catch(err => {
      console.error('Map data load error:', err);
      setLoading(false);
    });
  }, []);

  const statsTotal = reports.length;
  const statsL1 = reports.filter(r => r.triage_level === 1).length;
  const statsResolved = wardStats.reduce((s, w) => s + w.resolved_last_7d, 0);

  const wardStatMap = new Map<string, WardStat>();
  wardStats.forEach(w => {
    wardStatMap.set(w.ward_name, w);
    wardStatMap.set(normalizeWardName(w.ward_name), w);
  });

  const findWardStat = (rawGeoJsonName: string): WardStat | undefined => {
    // 1. Try exact match first
    const exact = wardStatMap.get(rawGeoJsonName);
    if (exact) return exact;

    // 2. Try normalized match
    const normalized = wardStatMap.get(normalizeWardName(rawGeoJsonName));
    if (normalized) return normalized;

    // 3. Try alias reverse lookup (GeoJSON name → Supabase names)
    const aliases = GEOJSON_TO_SUPABASE[rawGeoJsonName] ?? [];
    for (const alias of aliases) {
      const found = wardStatMap.get(alias)
                 ?? wardStatMap.get(normalizeWardName(alias));
      if (found) return found;
    }

    return undefined;
  };

  const styleFeature = (feature?: GeoJSON.Feature) => {
    const props = (feature?.properties ?? {}) as Record<string, unknown>;
    const wardName = getWardName(props);
    const stat = findWardStat(wardName);
    const score = stat?.health_score ?? 100;
    const color = wardColor(score);
    return {
      fillColor: color,
      fillOpacity: 0.3,
      color,
      weight: 1.5,
      opacity: 0.7,
    };
  };

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const wardName = getWardName(props);
    const stat = findWardStat(wardName);

    (layer as L.Path).on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.55 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.3 });
      },
      click: () => {
        if (stat) setSelectedWard(stat);
        else setSelectedWard({
          ward_name: wardName, ward_zone: '',
          health_score: 100, open_l1: 0, open_l2: 0, open_l3: 0,
          escalated: 0, resolved_last_7d: 0, total_open: 0, top_issue: '',
        });
      },
    });

    (layer as L.Path).bindTooltip(
      `<span style="font-family:DM Sans;font-size:12px;color:#f0ede8">${wardName}</span>`,
      { sticky: true, opacity: 0.9, className: 'leaflet-tooltip-dark' }
    );
  };

  const visibleReports = reports.filter(r => {
    if (layers.escalated && r.status === 'escalated') return true;
    if (r.status === 'open') return true;
    return false;
  });

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: '#080f0c',
        borderBottom: '1px solid rgba(15,110,86,0.2)',
        padding: '10px 24px',
        display: 'flex', gap: 32, alignItems: 'center',
      }}>
        {[
          { value: statsTotal,     label: 'Active Reports'    },
          { value: statsL1,        label: 'L1 Urgent'         },
          { value: statsResolved,  label: 'Resolved / 7d'     },
          { value: wardCount || 225, label: 'Wards Monitored' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Playfair Display', color: '#0F6E56',
              fontSize: 22, fontWeight: 700, lineHeight: 1,
            }}>{value}</div>
            <div style={{
              fontFamily: 'DM Sans', color: '#8a9e96',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {([
            { key: 'heat',      label: '🔥 Heat'      },
            { key: 'resolved',  label: '✓ Resolved'   },
            { key: 'escalated', label: '⚠️ Escalated' },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => setLayers(l => ({ ...l, [key]: !l[key] }))}
              style={{
                background: layers[key] ? '#0F6E56' : '#162118',
                color: 'white',
                border: `1px solid rgba(15,110,86,${layers[key] ? '1' : '0.4'})`,
                borderRadius: 20, padding: '5px 12px',
                fontSize: 11, cursor: 'pointer',
                fontFamily: 'DM Sans',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        minZoom={BENGALURU_MIN_ZOOM}
        maxZoom={17}
        maxBounds={BENGALURU_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: 'calc(100vh - 170px)', width: '100%', background: '#080f0c' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a> · Ward data: <a href="https://data.opencity.in">OpenCity</a> / BBMP 2023'
        />

        <FocusHandler
          reports={reports}
          markerRefs={markerRefs}
          onFocusReport={setSelectedReport}
        />

        <WardFocusHandler
          geoJson={geoJson}
          wardStats={wardStats}
          findWardStat={findWardStat}
          onFocusWard={setSelectedWard}
        />

        {geoJson && (
          <GeoJSON
            key={JSON.stringify(wardStats.map(w => w.health_score))}
            data={geoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}

        {visibleReports.map(r => {
          const color = r.status === 'escalated' ? '#e53e3e' : triageColor(r.triage_level);
          const radius = r.triage_level === 1 ? 8 : r.triage_level === 2 ? 6 : 5;
          const triageLabel = r.triage_level === 1 ? '⚡ L1 URGENT'
            : r.triage_level === 2 ? '⏱ L2 MEDIUM'
            : '✓ L3 ROUTINE';
          const photoBlock = r.image_url
            ? `<div style="
                width: 80px; height: 80px;
                background-image: url('${r.image_url}');
                background-size: cover;
                background-position: center;
                border-radius: 8px;
                flex-shrink: 0;
              "></div>`
            : `<div style="
                width: 80px; height: 80px;
                background: #162118;
                border-radius: 8px;
                display: flex; align-items: center; justify-content: center;
                color: #8a9e96; font-size: 11px; flex-shrink: 0;
              ">No photo</div>`;
          const fwdCount = (r.forwarded_channels ?? []).length;
          const fwdBlock = fwdCount > 0
            ? `<div style="color:#0F6E56;font-size:11px;margin-top:6px">
                 📡 Reached ${fwdCount} ${fwdCount === 1 ? 'channel' : 'channels'}
               </div>`
            : `<div style="color:#8a9e96;font-size:11px;margin-top:6px">
                 Not yet amplified
               </div>`;
          const tooltipHtml = `<div style="
              display: flex; gap: 12px;
              min-width: 280px; padding: 4px;
              font-family: 'DM Sans', sans-serif;
            ">
              ${photoBlock}
              <div style="flex: 1; min-width: 0;">
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                  <span style="
                    background:${color};color:white;
                    padding:2px 8px;border-radius:10px;
                    font-size:10px;font-weight:600;
                  ">${triageLabel}</span>
                </div>
                <div style="color:#f0ede8;font-size:13px;font-weight:500;margin-bottom:2px">
                  ${r.issue_type}
                </div>
                <div style="color:#8a9e96;font-size:12px;margin-bottom:4px">
                  ${r.locality_name ?? r.ward_name}
                </div>
                <div style="color:#8a9e96;font-size:11px;font-family:'JetBrains Mono'">
                  ${r.report_id_human} · ${timeAgo(r.created_at)}
                </div>
                ${fwdBlock}
              </div>
            </div>`;
          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color, fillOpacity: 0.9,
                color: 'white', weight: 1.5, opacity: 1,
              }}
              ref={(inst) => {
                if (inst) {
                  markerRefs.current.set(r.report_id_human, inst);
                  if (!inst.getTooltip()) {
                    inst.bindTooltip(tooltipHtml, {
                      sticky: false,
                      direction: 'top',
                      offset: [0, -8],
                      opacity: 1,
                      className: 'nammuru-tooltip',
                    });
                  }
                }
              }}
              eventHandlers={{
                click: () => setSelectedReport(r),
              }}
            />
          );
        })}
      </MapContainer>

      {selectedReport && (
        <ReportStoryPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {selectedWard && (
        <div style={{
          position: 'absolute', bottom: 24, left: 24, zIndex: 1000,
          background: '#0e1a15',
          borderLeft: '4px solid #0F6E56',
          borderRadius: 12, padding: 16, minWidth: 260,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{
              fontFamily: 'Playfair Display', color: '#f0ede8', fontSize: 15,
            }}>
              {selectedWard.ward_name}
            </span>
            <button onClick={() => setSelectedWard(null)}
              style={{ color: '#8a9e96', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
              ✕
            </button>
          </div>
          {selectedWard.ward_zone && (
            <div style={{ color: '#8a9e96', fontSize: 12, marginBottom: 12 }}>
              {selectedWard.ward_zone} Zone
            </div>
          )}
          <div style={{
            color: wardColor(selectedWard.health_score),
            fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 700, lineHeight: 1,
          }}>
            {selectedWard.health_score}
          </div>
          <div style={{ color: '#8a9e96', fontSize: 11, marginBottom: 14 }}>
            Ward Health Score
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14,
          }}>
            {[
              { label: 'L1 Urgent',    value: selectedWard.open_l1,        color: '#e53e3e' },
              { label: 'L2 Medium',    value: selectedWard.open_l2,        color: '#d97706' },
              { label: 'Resolved/7d',  value: selectedWard.resolved_last_7d, color: '#0F6E56' },
              { label: 'Escalated',    value: selectedWard.escalated,      color: '#e53e3e' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#162118', borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ color, fontSize: 20, fontFamily: 'Playfair Display', fontWeight: 700 }}>
                  {value}
                </div>
                <div style={{ color: '#8a9e96', fontSize: 10, fontFamily: 'DM Sans' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
          {selectedWard.top_issue && (
            <div style={{ color: '#8a9e96', fontSize: 12, marginBottom: 14, fontFamily: 'DM Sans' }}>
              Top issue: <span style={{ color: '#f0ede8' }}>{selectedWard.top_issue}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/report" style={{
              flex: 1, background: '#0F6E56', color: 'white',
              borderRadius: 20, padding: '7px 12px',
              textAlign: 'center', fontSize: 12,
              textDecoration: 'none', fontFamily: 'DM Sans', fontWeight: 600,
            }}>
              File report
            </a>
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(8,15,12,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
      )}
    </div>
  );
}
