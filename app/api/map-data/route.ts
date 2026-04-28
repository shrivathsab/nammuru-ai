import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import wardZonesData from '@/scripts/ward-zones.json';
import { WARD_ALIASES } from '@/lib/ward-aliases';

export const runtime = 'nodejs';

const WARD_ZONES: Record<string, string> = {
  ...(wardZonesData as Record<string, string>),
  // Canonical 2023 GeoJSON names for pilot wards
  'Hudi':         'East',       // was Whitefield in old delimitation
  'HSR Layout':   'Bommanahalli',
  'Koramangala':  'South',
  'Indiranagar':  'East',
  'Jayanagar':    'South',
};

// Mirror zone for every Supabase variant via the alias map,
// so reports stored under old delimitation names still resolve a zone.
for (const [supabaseName, geoJsonName] of Object.entries(WARD_ALIASES)) {
  const zone = WARD_ZONES[geoJsonName];
  if (zone && !WARD_ZONES[supabaseName]) {
    WARD_ZONES[supabaseName] = zone;
  }
}

function computeHealthScore(
  openL1: number, openL2: number, openL3: number,
  escalated: number, resolvedLast7d: number
): number {
  return Math.max(0, Math.min(100,
    100
    - (openL1 * 15)
    - (openL2 * 7)
    - (openL3 * 3)
    - (escalated * 20)
    + (resolvedLast7d * 5)
  ));
}

type MapReportRow = {
  id: string;
  report_id_human: string | null;
  lat: number;
  lng: number;
  ward_name: string | null;
  issue_type: string | null;
  severity: string | null;
  triage_level: number | null;
  status: string;
  created_at: string;
  locality_name: string | null;
  cluster_count: number | null;
  description: string | null;
  image_url: string | null;
  forwarded_channels: Array<{ channel: string; at: string }> | null;
};

export async function GET() {
  try {
    const supabase = getServerClient();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(
        'id, report_id_human, lat, lng, ward_name, issue_type, ' +
        'severity, triage_level, status, created_at, locality_name, ' +
        'cluster_count, description, image_url, forwarded_channels'
      )
      .in('status', ['open', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(500);

    if (reportsError) throw reportsError;

    const { data: resolvedReports, error: resolvedError } = await supabase
      .from('reports')
      .select('ward_name')
      .eq('status', 'resolved')
      .gte('created_at', sevenDaysAgo);

    if (resolvedError) throw resolvedError;

    const rows = (reports ?? []) as unknown as MapReportRow[];
    const resolved = (resolvedReports ?? []) as unknown as { ward_name: string | null }[];

    const wardMap = new Map<string, {
      open_l1: number; open_l2: number; open_l3: number;
      escalated: number; resolved_last_7d: number;
      issues: string[];
    }>();

    for (const r of rows) {
      if (!r.ward_name) continue;
      if (!wardMap.has(r.ward_name)) {
        wardMap.set(r.ward_name, {
          open_l1: 0, open_l2: 0, open_l3: 0,
          escalated: 0, resolved_last_7d: 0, issues: [],
        });
      }
      const w = wardMap.get(r.ward_name)!;
      if (r.status === 'escalated') w.escalated++;
      else if (r.triage_level === 1) w.open_l1++;
      else if (r.triage_level === 2) w.open_l2++;
      else w.open_l3++;
      if (r.issue_type) w.issues.push(r.issue_type);
    }

    for (const r of resolved) {
      if (!r.ward_name) continue;
      if (!wardMap.has(r.ward_name)) {
        wardMap.set(r.ward_name, {
          open_l1: 0, open_l2: 0, open_l3: 0,
          escalated: 0, resolved_last_7d: 0, issues: [],
        });
      }
      wardMap.get(r.ward_name)!.resolved_last_7d++;
    }

    const wardStats = Array.from(wardMap.entries()).map(([ward_name, w]) => {
      const issueCounts = w.issues.reduce<Record<string, number>>((acc, i) => {
        acc[i] = (acc[i] ?? 0) + 1;
        return acc;
      }, {});
      const top_issue = Object.entries(issueCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

      return {
        ward_name,
        ward_zone: WARD_ZONES[ward_name] ?? '',
        health_score: computeHealthScore(
          w.open_l1, w.open_l2, w.open_l3,
          w.escalated, w.resolved_last_7d
        ),
        open_l1: w.open_l1,
        open_l2: w.open_l2,
        open_l3: w.open_l3,
        escalated: w.escalated,
        resolved_last_7d: w.resolved_last_7d,
        total_open: w.open_l1 + w.open_l2 + w.open_l3,
        top_issue,
      };
    });

    return NextResponse.json(
      { reports: rows, wardStats },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } }
    );
  } catch (err) {
    console.error('[map-data] Error:', err);
    return NextResponse.json(
      { reports: [], wardStats: [] },
      { status: 200 }
    );
  }
}
