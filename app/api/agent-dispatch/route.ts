import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getServerClient } from '@/lib/supabase';
import type { Report } from '@/lib/types';
import { VERIFIED_CHANNELS } from '@/lib/routing';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.CITIZEN_EMAIL_FROM ?? 'onboarding@resend.dev';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// GBA migration (2 Sept 2025): the dissolved BBMP zone gmails (sebombbmp@…
// etc.) are gone — they cannot be verified as monitored. The GBA corporation
// commissioner is reached via the verified email of record (comm@bbmp.gov.in),
// which is normally the primary recipient. For L1 we keep it on the CC paper
// trail even if a legacy report carries a different recipient.
function buildCcList(triageLevel: number | null, toEmail: string): string[] {
  if (triageLevel === 1 && toEmail !== VERIFIED_CHANNELS.emailOfRecord) {
    return [VERIFIED_CHANNELS.emailOfRecord];
  }
  return [];
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

    const toEmail = report.email_recipient ?? VERIFIED_CHANNELS.emailOfRecord;
    const cc = buildCcList(report.triage_level, toEmail);
    const replyTo = report.citizen_email ? [report.citizen_email] : undefined;

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: FROM,
      to: toEmail,
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
