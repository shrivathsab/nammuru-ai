import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

type NearbyReportRow = {
  id: string;
  lat: number;
  lng: number;
  triage_level: number | null;
  status: string;
  created_at: string;
  issue_type: string | null;
  ward_name: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseFloat(searchParams.get('radius') ?? '200');

    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json(
        { error: 'Invalid lat/lng', reports: [] },
        { status: 400 }
      );
    }

    const latDelta = radius / 111000;
    const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180));

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('reports')
      .select('id, lat, lng, triage_level, status, created_at, issue_type, ward_name')
      .in('status', ['open', 'escalated'])
      .gte('created_at', thirtyDaysAgo)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const reports = (data ?? []) as unknown as NearbyReportRow[];

    return NextResponse.json(
      { reports },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('[nearby-reports] Error:', err);
    return NextResponse.json({ reports: [] }, { status: 200 });
  }
}
