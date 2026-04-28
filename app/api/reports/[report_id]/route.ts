import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ report_id: string }>;
}

interface ReportRow {
  report_id_human: string | null;
  created_at: string;
  issue_type: string;
  severity: string | null;
  status: string;
  lat: number;
  lng: number;
  ward_name: string;
  locality_name: string | null;
  triage_level: number | null;
  cluster_count: number | null;
  email_draft: string | null;
  email_subject: string | null;
  email_recipient: string | null;
  tweet_primary: string | null;
}

const TRIAGE_LABELS: Record<number, string> = {
  1: 'Level 1 — Safety',
  2: 'Level 2 — Systemic',
  3: 'Level 3 — Routine',
};

export async function GET(_req: Request, ctx: RouteContext) {
  const { report_id } = await ctx.params;

  try {
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('reports')
      .select(
        'report_id_human, created_at, issue_type, severity, status, ' +
        'lat, lng, ward_name, locality_name, triage_level, cluster_count, ' +
        'email_draft, email_subject, email_recipient, tweet_primary'
      )
      .eq('report_id_human', report_id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const row = data as unknown as ReportRow;
    const triageLevel = (row.triage_level ?? 3) as 1 | 2 | 3;

    return NextResponse.json({
      report_id_human: row.report_id_human ?? report_id,
      created_at: row.created_at,
      issue_type: row.issue_type,
      severity: row.severity ?? 'medium',
      status: row.status ?? 'open',
      lat: row.lat,
      lng: row.lng,
      ward_name: row.ward_name,
      locality_name: row.locality_name ?? row.ward_name,
      triage_level: triageLevel,
      triage_label: TRIAGE_LABELS[triageLevel] ?? `Level ${triageLevel}`,
      cluster_count: row.cluster_count ?? 1,
      email_body: row.email_draft ?? '',
      subject: row.email_subject ?? '',
      recipient_email: row.email_recipient ?? 'grievance@bbmp.gov.in',
      cc_emails: [],
      tweet_primary: row.tweet_primary ?? '',
      citizen_email: null,
    });
  } catch (err) {
    console.error('[api/reports/:id] error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
