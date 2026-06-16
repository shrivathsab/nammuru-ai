import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import type { UpvoteRequest } from '@/lib/types';

export const runtime = 'nodejs';

const GPS_THRESHOLD_METERS = 200;
const MONTHLY_UPVOTE_LIMIT = 5;
const SWARM_SIGNAL_THRESHOLD = 15; // (reports × 3) + (upvotes × 1) >= 15

interface ReportLite {
  id: string;
  lat: number;
  lng: number;
  status: string;
  cluster_count: number | null;
  upvote_count: number | null;
  triage_level: number | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as UpvoteRequest | null;

    if (
      !body ||
      typeof body.report_id_human !== 'string' ||
      !body.report_id_human ||
      typeof body.device_hash !== 'string' ||
      !body.device_hash ||
      typeof body.lat !== 'number' ||
      !Number.isFinite(body.lat) ||
      typeof body.lng !== 'number' ||
      !Number.isFinite(body.lng)
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const { report_id_human, lat, lng, device_hash, note } = body;
    const supabase = getServerClient();

    // STEP 1 — Fetch the report
    const { data, error: reportError } = await supabase
      .from('reports')
      .select('id, lat, lng, status, cluster_count, upvote_count, triage_level')
      .eq('report_id_human', report_id_human)
      .maybeSingle();

    if (reportError || !data) {
      return NextResponse.json(
        { success: false, error: 'Report not found', error_code: 'not_found' },
        { status: 404 },
      );
    }

    const report = data as unknown as ReportLite;

    if (report.status === 'resolved') {
      return NextResponse.json(
        {
          success: false,
          error: 'This issue has been resolved.',
          error_code: 'already_resolved',
        },
        { status: 400 },
      );
    }

    // STEP 2 — GPS proximity check (~200m)
    const latDelta = Math.abs(lat - report.lat);
    const lngDelta = Math.abs(lng - report.lng);
    const GPS_DEG = GPS_THRESHOLD_METERS / 111_000;
    if (latDelta > GPS_DEG || lngDelta > GPS_DEG * 1.4) {
      return NextResponse.json(
        {
          success: false,
          error: `You need to be within ${GPS_THRESHOLD_METERS}m of this issue to upvote it.`,
          error_code: 'too_far',
        },
        { status: 400 },
      );
    }

    // STEP 3 — Monthly limit check (5/month per device)
    const monthYear = new Date().toISOString().slice(0, 7); // '2026-06'
    const { count: monthlyCount } = await supabase
      .from('report_upvotes')
      .select('id', { count: 'exact', head: true })
      .eq('device_hash', device_hash)
      .eq('month_year', monthYear);

    if ((monthlyCount ?? 0) >= MONTHLY_UPVOTE_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: `You've used all ${MONTHLY_UPVOTE_LIMIT} upvotes for this month.`,
          error_code: 'monthly_limit',
          monthly_remaining: 0,
        },
        { status: 429 },
      );
    }

    // STEP 4 — Insert upvote (unique constraint handles duplicates)
    const { error: insertError } = await supabase
      .from('report_upvotes')
      .insert({
        report_id: report.id,
        device_hash,
        lat,
        lng,
        month_year: monthYear,
        note: note ? note.slice(0, 20) : null,
      } as never);

    if (insertError) {
      if (insertError.code === '23505') {
        // unique (report_id, device_hash) violation
        return NextResponse.json(
          {
            success: false,
            error: 'You have already upvoted this report.',
            error_code: 'already_upvoted',
          },
          { status: 409 },
        );
      }
      throw insertError;
    }

    // STEP 5 — Update report upvote_count + signal_score
    const newUpvoteCount = (report.upvote_count ?? 0) + 1;
    const newSignalScore = (report.cluster_count ?? 1) * 3 + newUpvoteCount;

    await supabase
      .from('reports')
      .update({
        upvote_count: newUpvoteCount,
        signal_score: newSignalScore,
      } as never)
      .eq('id', report.id);

    // STEP 6 — Trigger swarm if signal crosses threshold and none exists yet
    let swarmTriggered = false;
    if (newSignalScore >= SWARM_SIGNAL_THRESHOLD) {
      const { data: existingSwarm } = await supabase
        .from('swarms')
        .select('id')
        .contains('report_ids', [report.id])
        .eq('status', 'active')
        .maybeSingle();

      if (!existingSwarm) {
        const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
        fetch(`${BASE_URL}/api/create-swarm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id_human }),
        }).catch(() => {
          /* fire-and-forget — never block the upvote */
        });
        swarmTriggered = true;
      }
    }

    const monthlyRemaining = MONTHLY_UPVOTE_LIMIT - (monthlyCount ?? 0) - 1;

    return NextResponse.json({
      success: true,
      new_upvote_count: newUpvoteCount,
      new_signal_score: newSignalScore,
      monthly_remaining: Math.max(0, monthlyRemaining),
      swarm_triggered: swarmTriggered,
    });
  } catch (err) {
    console.error('[upvote] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 },
    );
  }
}
