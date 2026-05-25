import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getServerClient } from '@/lib/supabase';
import type { Report } from '@/lib/types';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.CITIZEN_EMAIL_FROM ?? 'onboarding@resend.dev';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const ZONE_CC: Record<string, string> = {
  Bommanahalli: 'sebombbmp@gmail.com',
  East:         'bbmpseeast@gmail.com',
  Mahadevapura: 'semdpura@gmail.com',
  South:        'sesouthbbmp@gmail.com',
  West:         'sebbmpwest123@gmail.com',
};

function buildCcList(triage_level: number | null, ward_zone: string | null): string[] {
  const cc: string[] = [];
  if (triage_level === 1) {
    cc.push('comm@bbmp.gov.in');
    if (ward_zone && ZONE_CC[ward_zone]) cc.push(ZONE_CC[ward_zone]);
  }
  return cc;
}

export async function POST(req: NextRequest) {
  try {
    const { report_id_human } = await req.json() as { report_id_human?: string };

    if (!report_id_human) {
      return NextResponse.json({ error: 'Missing report_id_human' }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('report_id_human', report_id_human)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = data as Report;

    if (!report.auto_dispatch) {
      return NextResponse.json({ skipped: true, reason: 'auto_dispatch_off' });
    }
    if (report.email_sent_at) {
      return NextResponse.json({ skipped: true, reason: 'already_sent' });
    }
    if (!report.email_draft || !report.email_recipient) {
      return NextResponse.json({ skipped: true, reason: 'missing_draft_or_recipient' });
    }

    const cc = buildCcList(report.triage_level, report.ward_zone);
    const replyTo = report.citizen_email ? [report.citizen_email] : undefined;

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: FROM,
      to: report.email_recipient,
      cc: cc.length > 0 ? cc : undefined,
      replyTo,
      subject: report.email_subject ?? `Civic complaint: ${report.issue_type}`,
      text: report.email_draft,
    });

    if (sendError) {
      console.error('[agent-dispatch] Resend error:', sendError);
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }

    await supabase
      .from('reports')
      .update({
        email_sent_at: new Date().toISOString(),
        email_sent_auto: true,
      } as never)
      .eq('id', report.id);

    fetch(`${BASE_URL}/api/agent-tweet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id_human }),
    }).catch(() => {});

    return NextResponse.json({ success: true, email_id: sendData?.id });

  } catch (err) {
    console.error('[agent-dispatch] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
