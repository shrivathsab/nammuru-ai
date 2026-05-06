import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createHmac } from 'crypto';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL ?? 'https://nammooru.in';
const FROM = process.env.CITIZEN_EMAIL_FROM ?? 'onboarding@resend.dev';
const HMAC_SECRET =
  process.env.HMAC_SECRET ??
  process.env.OFFICER_SECRET ??
  'dev-secret-replace-in-production';

const VALID_ACTIONS = ['acknowledged', 'resolved', 'escalated', 'followup'] as const;
type Action = typeof VALID_ACTIONS[number];

interface NotifyRequest {
  report_id_human: string;
  citizen_email?: string;
  action: Action;
  officer_note?: string;
}

interface ReportRow {
  report_id_human: string;
  issue_type: string;
  locality_name: string | null;
  ward_name: string;
  triage_level: number;
  status: string;
  citizen_email: string | null;
  created_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NotifyRequest;
    const { report_id_human, action, officer_note } = body;

    if (!report_id_human || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data: reportData, error } = await supabase
      .from('reports')
      .select(
        'report_id_human, issue_type, locality_name, ward_name, triage_level, status, citizen_email, created_at',
      )
      .eq('report_id_human', report_id_human)
      .single();

    if (error || !reportData) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const report = reportData as unknown as ReportRow;

    const citizenEmail = body.citizen_email ?? report.citizen_email;
    if (!citizenEmail) {
      return NextResponse.json({ success: false, reason: 'no_email' });
    }

    const SLA: Record<number, string> = { 1: '48 hours', 2: '7 days', 3: '30 days' };
    const deadline = SLA[report.triage_level] ?? '30 days';

    const daysOpen = Math.floor(
      (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    const citizenToken = createHmac('sha256', HMAC_SECRET)
      .update(`citizen:${report_id_human}`)
      .digest('hex')
      .slice(0, 16);

    const locality = report.locality_name ?? report.ward_name;
    const reportUrl = `${BASE_URL}/report/${report_id_human}`;

    let subject = '';
    let textBody = '';

    if (action === 'acknowledged') {
      subject = `Your report ${report_id_human} has been acknowledged`;
      textBody = [
        `Your civic report has been acknowledged by BBMP.`,
        ``,
        `Report: ${report_id_human}`,
        `Issue: ${report.issue_type} at ${locality}`,
        `Status: Acknowledged`,
        ``,
        `Expected resolution: within ${deadline}`,
        `View your report: ${reportUrl}`,
        ``,
        `— Nammooru Civic Platform`,
        `nammooru.in`,
      ].join('\n');
    } else if (action === 'resolved') {
      subject = `✓ Your report ${report_id_human} has been resolved`;
      textBody = [
        `Great news — your civic report has been marked as resolved.`,
        ``,
        `Report: ${report_id_human}`,
        `Issue: ${report.issue_type} at ${locality}`,
        `Status: Resolved`,
        officer_note ? `Note from officer: ${officer_note}` : '',
        ``,
        `If the issue persists, you can file a new report at:`,
        `${BASE_URL}/report`,
        ``,
        `Thank you for helping make Bengaluru better.`,
        `— Nammooru Civic Platform`,
      ]
        .filter(Boolean)
        .join('\n');
    } else if (action === 'escalated') {
      subject = `⚠️ Your report ${report_id_human} has been escalated`;
      textBody = [
        `No response was received within the required timeframe.`,
        `Your report has been automatically escalated.`,
        ``,
        `Report: ${report_id_human}`,
        `Issue: ${report.issue_type} at ${locality}`,
        `Deadline missed: ${deadline}`,
        `Days open: ${daysOpen}`,
        ``,
        `Next step — file an RTI notice:`,
        `${reportUrl}`,
        `(RTI draft will be available on your report page)`,
        ``,
        `— Nammooru Civic Platform`,
      ].join('\n');
    } else {
      subject = `Status update on your report ${report_id_human}`;
      textBody = [
        `This is a follow-up on your civic report.`,
        ``,
        `Report: ${report_id_human}`,
        `Issue: ${report.issue_type} at ${locality}`,
        `Days open: ${daysOpen}`,
        ``,
        `Has this issue been resolved?`,
        ``,
        `✓ Yes, it's fixed:`,
        `${BASE_URL}/resolve/${report_id_human}?action=resolved&token=${citizenToken}`,
        ``,
        `✗ No, still open:`,
        `${BASE_URL}/resolve/${report_id_human}?action=reopen&token=${citizenToken}`,
        ``,
        `↗ Escalate via RTI:`,
        `${BASE_URL}/resolve/${report_id_human}?action=escalate&token=${citizenToken}`,
        ``,
        `— Nammooru Civic Platform`,
      ].join('\n');
    }

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: FROM,
      to: citizenEmail,
      subject,
      text: textBody,
    });

    if (sendError) {
      console.error('[notify] Resend error:', sendError);
      return NextResponse.json(
        { success: false, error: 'Email send failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      action,
      email_id: sendData?.id,
    });
  } catch (err) {
    console.error('[notify] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
