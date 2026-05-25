import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerClient } from '@/lib/supabase';
import type { Report } from '@/lib/types';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SLA_HOURS: Record<number, number> = { 1: 48, 2: 168, 3: 720 };

export async function POST(req: NextRequest) {
  try {
    const { report_id_human } = await req.json() as { report_id_human?: string };
    if (!report_id_human) {
      return NextResponse.json({ error: 'Missing report_id_human' }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('report_id_human', report_id_human)
      .single();

    if (!data) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    const report = data as Report;

    if (report.rti_draft) {
      return NextResponse.json({ skipped: true, reason: 'already_drafted', rti_draft: report.rti_draft });
    }

    const filedDate = new Date(report.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const daysOpen = Math.floor(
      (Date.now() - new Date(report.created_at).getTime()) / 86_400_000
    );
    const slaHours = SLA_HOURS[report.triage_level ?? 3] ?? 720;

    const prompt = `Generate a formal RTI notice under Right to Information Act 2005.

ORIGINAL COMPLAINT:
Report ID: ${report.report_id_human}
Filed: ${filedDate}
Issue: ${report.issue_type} (${report.severity}) at ${report.locality_name ?? report.ward_name}, Bengaluru
Triage: Level ${report.triage_level} — SLA was ${slaHours} hours
Days without BBMP response: ${daysOpen}

Address RTI to:
The Public Information Officer, BBMP (Bruhat Bengaluru Mahanagara Palike)
${report.ward_zone ? report.ward_zone + ' Zone' : 'Bengaluru Central Zone'}

The RTI notice MUST include ALL of the following:
1. Legal basis: RTI Act 2005 Section 6(1)
2. Reference to original complaint ID ${report.report_id_human} filed on ${filedDate}
3. Reference to BBMP Act 1976 Section 58 (statutory maintenance obligation)
4. Information requested: (a) action taken, (b) officer assigned, (c) expected resolution, (d) reason for delay
5. Fee of Rs.10 payable via bbmpaponline.in or postal order
6. 30-day mandatory response window with penalty clause for non-compliance
7. Date, [Name] placeholder, [Address] placeholder, signature line

Return ONLY plain text RTI notice. No markdown, no code blocks, no preamble.
Format as a formal letter ready to print. Leave [Name] and [Address] as
the only placeholders — citizen fills these before filing.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const rtiText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    if (!rtiText) {
      return NextResponse.json({ error: 'Empty RTI draft from model' }, { status: 500 });
    }

    await supabase
      .from('reports')
      .update({
        rti_draft: rtiText,
        rti_generated_at: new Date().toISOString(),
      } as never)
      .eq('id', report.id);

    return NextResponse.json({ success: true, rti_draft: rtiText });

  } catch (err) {
    console.error('[draft-rti] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
