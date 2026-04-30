import { NextResponse, type NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_ACTIONS = ['resolved', 'reopen', 'escalate'] as const;
type ResolveAction = typeof VALID_ACTIONS[number];

const HMAC_SECRET =
  process.env.HMAC_SECRET ??
  process.env.OFFICER_SECRET ??
  'dev-secret-replace-in-production';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      report_id_human?: string;
      action?: string;
      token?: string;
    };

    const { report_id_human, action, token } = body;

    if (!report_id_human || !action || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!VALID_ACTIONS.includes(action as ResolveAction)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Verify citizen token — HMAC("citizen:" + reportId)
    const expected = createHmac('sha256', HMAC_SECRET)
      .update(`citizen:${report_id_human}`)
      .digest('hex')
      .slice(0, 16);

    if (token !== expected) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const supabase = getServerClient();

    // Fetch current report
    const { data: report, error: fetchErr } = await supabase
      .from('reports')
      .select('id, status, report_id_human')
      .eq('report_id_human' as never, report_id_human)
      .single<{ id: string; status: string; report_id_human: string }>();

    if (fetchErr || !report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Map action → status + timestamp field
    const STATUS_MAP: Record<ResolveAction, string> = {
      resolved:  'resolved',
      reopen:    'open',
      escalate:  'escalated',
    };
    const TIMESTAMP_MAP: Record<ResolveAction, string | null> = {
      resolved:  'resolved_at',
      reopen:    null,
      escalate:  'escalated_at',
    };

    const newStatus   = STATUS_MAP[action as ResolveAction];
    const tsField     = TIMESTAMP_MAP[action as ResolveAction];
    const now         = new Date().toISOString();

    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (tsField) updatePayload[tsField] = now;

    const { error: updateErr } = await supabase
      .from('reports')
      .update(updatePayload as never)
      .eq('id', report.id);

    if (updateErr) {
      console.error('[resolve] DB update error:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Fire-and-forget: notify citizen on resolved/escalated
    if (action === 'resolved' || action === 'escalate') {
      const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
      fetch(`${BASE_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id_human,
          action: action === 'escalate' ? 'escalated' : 'resolved',
        }),
      }).catch(() => {/* silent — never block resolve */});
    }

    return NextResponse.json({ success: true, status: newStatus });

  } catch (err) {
    console.error('[resolve] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
