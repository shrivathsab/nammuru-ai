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
}

export async function GET(req: NextRequest) {
  // Guard — Vercel sends the secret in Authorization header
  const authHeader = req.headers.get('authorization');
  const expected   = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerClient();
  const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
  const now      = new Date();

  // Fetch all open/acknowledged reports
  const { data: reports, error } = await supabase
    .from('reports')
    .select(
      'id, report_id_human, triage_level, citizen_email, ' +
      'created_at, last_followup_at, status'
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
    const sla      = SLA_HOURS[report.triage_level as 1 | 2 | 3] ?? 720;
    const hoursOpen =
      (now.getTime() - new Date(report.created_at).getTime()) / 3_600_000;

    if (hoursOpen >= sla) {
      // Past SLA → escalate
      await supabase
        .from('reports')
        .update({
          status:       'escalated',
          escalated_at: now.toISOString(),
        } as never)
        .eq('id', report.id);

      escalated++;

      if (report.citizen_email) {
        await fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            report_id_human: report.report_id_human,
            citizen_email:   report.citizen_email,
            action:          'escalated',
          }),
        }).catch(() => {/* silent */});
        notified++;
      }

    } else if (
      hoursOpen >= sla * 0.6 &&
      !report.last_followup_at
    ) {
      // 60% of SLA elapsed, no followup sent yet → send check-in
      if (report.citizen_email) {
        await fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            report_id_human: report.report_id_human,
            citizen_email:   report.citizen_email,
            action:          'followup',
          }),
        }).catch(() => {/* silent */});

        await supabase
          .from('reports')
          .update({ last_followup_at: now.toISOString() } as never)
          .eq('id', report.id);

        notified++;
      }
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
