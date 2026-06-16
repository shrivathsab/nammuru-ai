import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

import MiniMap from '@/components/MiniMap';
import UpvoteButton from '@/components/UpvoteButton';
import SwarmJoinCount from '@/components/SwarmJoinCount';
import { tokens } from '@/lib/design-tokens';
import { reportUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const TEAL = tokens.colors.teal;
const DARK = tokens.colors.dark;
const DARK2 = tokens.colors.dark2;
const DARK3 = tokens.colors.dark3;
const GOLD = tokens.colors.gold;
const TEXT_PRIMARY = tokens.colors.textPrimary;
const TEXT_MUTED = tokens.colors.textMuted;

const SWARM_THRESHOLD = 15;

interface SwarmRow {
  id: string;
  report_ids: string[] | null;
  lead_report_id: string | null;
  location_summary: string | null;
  ward_name: string | null;
  issue_type: string | null;
  report_count: number | null;
  upvote_count: number | null;
  signal_score: number | null;
  status: string;
  formal_email: string | null;
  tweet_thread: Array<{ text: string; type: string }> | null;
  whatsapp_message: string | null;
  dossier_summary: string | null;
  created_at: string;
}

interface ClusterReport {
  id: string;
  report_id_human: string | null;
  issue_type: string | null;
  locality_name: string | null;
  ward_name: string | null;
  lat: number;
  lng: number;
  triage_level: number | null;
  created_at: string;
}

interface PageParams {
  params: Promise<{ id: string }>;
}

async function fetchSwarm(id: string): Promise<SwarmRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('swarms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as SwarmRow;
  } catch {
    return null;
  }
}

async function fetchClusterReports(ids: string[]): Promise<ClusterReport[]> {
  if (ids.length === 0) return [];
  try {
    const { data } = await supabaseAdmin
      .from('reports')
      .select('id, report_id_human, issue_type, locality_name, ward_name, lat, lng, triage_level, created_at')
      .in('id', ids);
    return (data ?? []) as unknown as ClusterReport[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const swarm = await fetchSwarm(id);
  if (!swarm) return { title: 'Community Swarm — Nammooru' };
  return {
    title: `Community Swarm — ${swarm.location_summary ?? swarm.ward_name ?? 'Bengaluru'}`,
    description:
      swarm.dossier_summary ??
      `${swarm.report_count ?? 0} reports + ${swarm.upvote_count ?? 0} citizen voices corroborate this issue.`,
  };
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHr = Math.floor(diffMs / 3_600_000);
  if (diffHr < 1) return 'just now';
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function NotFound() {
  return (
    <main style={{ background: DARK, color: TEXT_PRIMARY, minHeight: '100vh', fontFamily: tokens.fonts.sans, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ fontFamily: tokens.fonts.serif, fontSize: 24, marginBottom: 12 }}>Swarm not found</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 24 }}>
          This community swarm may have been resolved or the link is incorrect.
        </p>
        <Link href="/map" style={{ background: TEAL, color: 'white', padding: '10px 24px', borderRadius: 999, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← Browse the live map
        </Link>
      </div>
    </main>
  );
}

export default async function SwarmPage({ params }: PageParams) {
  const { id } = await params;
  const swarm = await fetchSwarm(id);
  if (!swarm) return <NotFound />;

  const reportCount = swarm.report_count ?? 0;
  const upvoteCount = swarm.upvote_count ?? 0;
  const signalScore = swarm.signal_score ?? 0;
  const cluster = await fetchClusterReports(swarm.report_ids ?? []);
  const lead = cluster.find((r) => r.id === swarm.lead_report_id) ?? cluster[0];
  const centerLat = lead?.lat ?? 12.9716;
  const centerLng = lead?.lng ?? 77.5946;

  const tweetPrimary = swarm.tweet_thread?.find((t) => t.type === 'primary')?.text ?? '';
  const waText = swarm.whatsapp_message ?? '';

  return (
    <main style={{ background: DARK, color: TEXT_PRIMARY, minHeight: '100vh', fontFamily: tokens.fonts.sans }}>
      <style>{`@keyframes swarmPulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }`}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 64px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 16px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${GOLD}`, animation: 'swarmPulse 2s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🔥</div>
          </div>
          <p style={{ color: GOLD, fontFamily: tokens.fonts.mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Community Swarm
          </p>
          <h1 style={{ fontFamily: tokens.fonts.serif, color: TEXT_PRIMARY, fontSize: '2rem', lineHeight: 1.2, margin: '0 0 8px' }}>
            {reportCount} reports + <SwarmJoinCount swarmId={swarm.id} baseVoices={upvoteCount} />
          </h1>
          <p style={{ color: TEXT_MUTED, fontFamily: tokens.fonts.sans, fontSize: 15 }}>
            {swarm.location_summary ?? `${swarm.issue_type ?? 'Civic issue'} at ${swarm.ward_name ?? 'Bengaluru'}`}
          </p>
        </div>

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(15,110,86,0.3)', marginBottom: 16 }}>
          <MiniMap
            lat={centerLat}
            lng={centerLng}
            wardName={swarm.ward_name ?? undefined}
            nearbyReports={cluster.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, triage_level: r.triage_level ?? 3 }))}
            zoom={14}
            height="280px"
            showAttribution
          />
        </div>

        {/* Dossier */}
        {swarm.dossier_summary && (
          <div style={{ background: DARK2, borderLeft: `4px solid ${TEAL}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: TEAL, fontFamily: tokens.fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              The Pattern
            </div>
            <p style={{ color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{swarm.dossier_summary}</p>
          </div>
        )}

        {/* Signal meter */}
        <div style={{ background: DARK2, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500 }}>
            <span>Signal strength</span>
            <span style={{ color: GOLD }}>{signalScore} / {SWARM_THRESHOLD}</span>
          </div>
          <div style={{ height: 6, background: DARK3, borderRadius: 3, marginTop: 8 }}>
            <div style={{ height: '100%', borderRadius: 3, background: GOLD, width: `${Math.min(100, (signalScore / (SWARM_THRESHOLD * 2)) * 100)}%` }} />
          </div>
          <p style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 6, margin: '6px 0 0' }}>
            {reportCount} reports × 3 + {upvoteCount} upvotes × 1
          </p>
        </div>

        {/* Action grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: DARK2, borderRadius: 12, padding: 14 }}>
            <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Add Your Voice</div>
            {lead ? (
              <UpvoteButton
                reportIdHuman={lead.report_id_human ?? ''}
                reportLat={lead.lat}
                reportLng={lead.lng}
                currentUpvotes={upvoteCount}
              />
            ) : (
              <p style={{ color: TEXT_MUTED, fontSize: 12 }}>Visit the location to corroborate.</p>
            )}
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: DARK2, borderRadius: 12, padding: 14, textDecoration: 'none', color: TEXT_PRIMARY, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Share on WhatsApp</div>
            <span style={{ color: '#25D366', fontSize: 13, fontWeight: 600 }}>Rally neighbours →</span>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetPrimary)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: DARK2, borderRadius: 12, padding: 14, textDecoration: 'none', color: TEXT_PRIMARY, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Tweet this</div>
            <span style={{ color: TEAL, fontSize: 13, fontWeight: 600 }}>Public pressure →</span>
          </a>
        </div>

        {/* Formal letter */}
        {swarm.formal_email && (
          <details style={{ background: DARK2, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <summary style={{ color: TEAL, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              View formal letter sent to the GBA
            </summary>
            <pre style={{ background: DARK, padding: 14, borderRadius: 8, marginTop: 12, fontSize: 12, color: TEXT_PRIMARY, fontFamily: tokens.fonts.mono, whiteSpace: 'pre-wrap', lineHeight: 1.6, overflowX: 'auto' }}>
              {swarm.formal_email}
            </pre>
          </details>
        )}

        {/* Reports in this swarm */}
        {cluster.length > 0 && (
          <div>
            <div style={{ color: TEXT_MUTED, fontFamily: tokens.fonts.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              {cluster.length} reports in this swarm
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cluster.map((r) => (
                <Link
                  key={r.id}
                  href={r.report_id_human ? `/report/${r.report_id_human}` : '#'}
                  style={{ background: DARK2, borderRadius: 10, padding: '12px 14px', textDecoration: 'none', color: TEXT_PRIMARY, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.issue_type ?? 'Civic issue'}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12 }}>
                      {r.locality_name ?? r.ward_name ?? 'Bengaluru'} · {timeAgo(r.created_at)}
                    </div>
                  </div>
                  <span style={{ color: TEAL, fontSize: 12, whiteSpace: 'nowrap' }}>View →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/map" style={{ color: TEXT_MUTED, fontSize: 13, textDecoration: 'none' }}>
            ← Back to the live map
          </Link>
        </div>
      </div>
    </main>
  );
}
