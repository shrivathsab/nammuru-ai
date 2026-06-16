import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ report_id: string }>;
}

// Loose shape — select('*') returns every column; we read defensively so a
// not-yet-migrated column simply surfaces as null instead of throwing.
interface ReportRow {
  report_id_human: string | null;
  created_at: string;
  issue_type: string | null;
  severity: string | null;
  status: string | null;
  lat: number;
  lng: number;
  ward_name: string | null;
  ward_zone: string | null;
  locality_name: string | null;
  pincode: string | null;
  nearest_landmark: string | null;
  triage_level: number | null;
  cluster_count: number | null;
  image_url: string | null;
  email_draft: string | null;
  email_subject: string | null;
  email_recipient: string | null;
  citizen_email: string | null;
  tweet_primary: string | null;
  tweet_reply_evidence: string | null;
  tweet_reply_escalation: string | null;
  // Agent Mode + escalation lifecycle (Day 7B)
  auto_dispatch: boolean | null;
  email_sent_at: string | null;
  email_sent_auto: boolean | null;
  tweet_id: string | null;
  escalation_level: number | null;
  rti_draft: string | null;
  rti_generated_at: string | null;
  local_context: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  acknowledged_at: string | null;
  last_followup_at: string | null;
  forwarded_channels: Array<{ channel: string; at: string }> | null;
  status_history: Array<{ status: string; at: string }> | null;
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
    // select('*') — robust against schema drift; never names a column that
    // might not be migrated yet (a missing column would 400 the whole query).
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('report_id_human', report_id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const row = data as unknown as Partial<ReportRow>;
    const triageLevel = (row.triage_level ?? 3) as 1 | 2 | 3;

    return NextResponse.json({
      // ── Identity + core ──────────────────────────────────────────
      report_id_human: row.report_id_human ?? report_id,
      created_at: row.created_at,
      issue_type: row.issue_type,
      severity: row.severity ?? 'medium',
      status: row.status ?? 'open',
      lat: row.lat,
      lng: row.lng,
      ward_name: row.ward_name,
      ward_zone: row.ward_zone ?? null,
      locality_name: row.locality_name ?? row.ward_name,
      pincode: row.pincode ?? null,
      nearest_landmark: row.nearest_landmark ?? null,
      triage_level: triageLevel,
      triage_label: TRIAGE_LABELS[triageLevel] ?? `Level ${triageLevel}`,
      cluster_count: row.cluster_count ?? 1,
      image_url: row.image_url ?? null,

      // ── Email (raw + transformed convenience aliases) ────────────
      email_draft: row.email_draft ?? null,
      email_subject: row.email_subject ?? null,
      email_recipient: row.email_recipient ?? null,
      email_body: row.email_draft ?? '',
      subject: row.email_subject ?? '',
      recipient_email: row.email_recipient ?? 'comm@bbmp.gov.in',
      cc_emails: [],
      citizen_email: row.citizen_email ?? null,

      // ── Tweet ────────────────────────────────────────────────────
      tweet_primary: row.tweet_primary ?? '',
      tweet_reply_evidence: row.tweet_reply_evidence ?? null,
      tweet_reply_escalation: row.tweet_reply_escalation ?? null,

      // ── Agent Mode dispatch + escalation lifecycle (Day 7B) ──────
      auto_dispatch: row.auto_dispatch ?? false,
      email_sent_at: row.email_sent_at ?? null,
      email_sent_auto: row.email_sent_auto ?? false,
      tweet_id: row.tweet_id ?? null,
      escalation_level: row.escalation_level ?? 0,
      rti_draft: row.rti_draft ?? null,
      rti_generated_at: row.rti_generated_at ?? null,
      local_context: row.local_context ?? null,
      resolved_at: row.resolved_at ?? null,
      escalated_at: row.escalated_at ?? null,
      acknowledged_at: row.acknowledged_at ?? null,
      last_followup_at: row.last_followup_at ?? null,
      forwarded_channels: row.forwarded_channels ?? [],
      status_history: row.status_history ?? [],
    });
  } catch (err) {
    console.error('[api/reports/:id] error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
