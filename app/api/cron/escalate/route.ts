import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const SLA_HOURS: Record<number, number> = {
  1: 48,    // L1 URGENT
  2: 168,   // L2 MEDIUM  (7 days)
  3: 720,   // L3 ROUTINE (30 days)
};

interface EscalateRow {
  id: string;
  report_id_human: string;
  triage_level: number;
  citizen_email: string | null;
  created_at: string;
  last_followup_at: string | null;
  status: string;
  escalation_level: number | null;
}

export async function GET(req: NextRequest) {
  // Guard — Vercel sends the secret in Authorization header
  const authHeader = req.headers.get('authorization');
  const expected   = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerClient();
  const BASE_URL = process.env.BASE_URL ?? 'https://nammooru.in';
  const now      = new Date();

  // Fetch all open/acknowledged reports
  const { data: reports, error } = await supabase
    .from('reports')
    .select(
      'id, report_id_human, triage_level, citizen_email, ' +
      'created_at, last_followup_at, status, escalation_level'
    )
    .in('status', ['open', 'acknowledged'])
    .returns<EscalateRow[]>();

  if (error) {
    console.error('[cron/escalate] DB error:', error);
    return NextResponse.json({ error: 'DB query failed' }, { status: 500 });
  }

  let escalated = 0;
  let notified  = 0;

  for (const report of reports ?? []) {
    const sla = SLA_HOURS[report.triage_level ?? 3] ?? 720;
    const hoursOpen =
      (Date.now() - new Date(report.created_at).getTime()) / 3_600_000;
    const currentLevel = report.escalation_level ?? 0;
    let newLevel = currentLevel;

    // Level 0 -> 1: L1 at 50% SLA (24h) — gentle followup
    if (currentLevel < 1 && report.triage_level === 1 && hoursOpen >= sla * 0.5) {
      newLevel = 1;
      if (report.citizen_email) {
        fetch(`${BASE_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id_human: report.report_id_human, action: 'followup' }),
        }).catch(err => console.warn('[cron] followup notify non-fatal:', err));
        notified++;
      }
    }

    // Level 1 -> 2: SLA fully breached — escalate
    if (currentLevel < 2 && hoursOpen >= sla) {
      newLevel = 2;

      await supabase
        .from('reports')
        .update({
          status: 'escalated',
          escalated_at: new Date().toISOString(),
        } as never)
        .eq('id', report.id);

      escalated++;

      if (report.citizen_email) {
        fetch(`${BASE_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id_human: report.report_id_human, action: 'escalated' }),
        }).catch(err => console.warn('[cron] escalated notify non-fatal:', err));
        notified++;
      }
    }

    // Level 2 -> 3: 7 days post-breach — generate RTI draft
    if (currentLevel < 3 && hoursOpen >= sla + 168) {
      newLevel = 3;
      fetch(`${BASE_URL}/api/draft-rti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id_human: report.report_id_human }),
      }).catch(err => console.warn('[cron] RTI draft non-fatal:', err));
    }

    // Persist if level advanced
    if (newLevel !== currentLevel) {
      await supabase
        .from('reports')
        .update({ escalation_level: newLevel } as never)
        .eq('id', report.id);
    }
  }

  return NextResponse.json({
    success:   true,
    checked:   reports?.length ?? 0,
    escalated,
    notified,
    timestamp: now.toISOString(),
  });
}
