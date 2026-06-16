import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { getServerClient } from '@/lib/supabase';
import { corporationName, VERIFIED_CHANNELS } from '@/lib/routing';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FROM = process.env.CITIZEN_EMAIL_FROM ?? 'onboarding@resend.dev';

interface TriggerReport {
  id: string;
  report_id_human: string | null;
  issue_type: string | null;
  severity: string | null;
  ward_name: string | null;
  locality_name: string | null;
  lat: number;
  lng: number;
  upvote_count: number | null;
}

interface NearbyReport {
  id: string;
  report_id_human: string | null;
  issue_type: string | null;
  severity: string | null;
  locality_name: string | null;
  created_at: string;
  upvote_count: number | null;
}

interface SwarmDossier {
  location_summary: string;
  dossier_summary: string;
  formal_email_subject: string;
  formal_email_body: string;
  tweet_primary: string;
  tweet_reply: string;
  whatsapp_message: string;
}

export async function POST(req: NextRequest) {
  try {
    const { report_id_human } = (await req.json().catch(() => ({}))) as {
      report_id_human?: string;
    };
    if (!report_id_human) {
      return NextResponse.json({ error: 'Missing report_id_human' }, { status: 400 });
    }

    const supabase = getServerClient();

    // STEP 1 — triggering report
    const { data: trigData } = await supabase
      .from('reports')
      .select('id, report_id_human, issue_type, severity, ward_name, locality_name, lat, lng, upvote_count')
      .eq('report_id_human', report_id_human)
      .maybeSingle();

    if (!trigData) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    const trigger = trigData as unknown as TriggerReport;

    // STEP 2 — idempotency: bail if an active swarm already covers this report
    const { data: existing } = await supabase
      .from('swarms')
      .select('id')
      .contains('report_ids', [trigger.id])
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        skipped: true,
        reason: 'swarm_exists',
        swarm_id: (existing as { id: string }).id,
      });
    }

    // STEP 3 — nearby reports (~100m, last 30 days, unresolved)
    const latDelta = 0.0009;
    const lngDelta = 0.001;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: nearbyData } = await supabase
      .from('reports')
      .select('id, report_id_human, issue_type, severity, locality_name, created_at, upvote_count')
      .gte('lat', trigger.lat - latDelta)
      .lte('lat', trigger.lat + latDelta)
      .gte('lng', trigger.lng - lngDelta)
      .lte('lng', trigger.lng + lngDelta)
      .neq('status', 'resolved')
      .gte('created_at', since)
      .limit(50);

    const nearby = (nearbyData ?? []) as unknown as NearbyReport[];
    const reportIds = Array.from(new Set([trigger.id, ...nearby.map((r) => r.id)]));
    const reportCount = reportIds.length;
    const upvoteCount =
      (trigger.upvote_count ?? 0) +
      nearby
        .filter((r) => r.id !== trigger.id)
        .reduce((sum, r) => sum + (r.upvote_count ?? 0), 0);
    const signalScore = reportCount * 3 + upvoteCount;

    const locality = trigger.locality_name ?? trigger.ward_name ?? 'Bengaluru';
    const wardName = trigger.ward_name ?? 'Bengaluru';
    const corpName = corporationName(trigger.ward_name);
    const reportsSummary = nearby
      .slice(0, 12)
      .map((r) => `- ${r.issue_type ?? 'Issue'} (${r.severity ?? 'n/a'}) at ${r.locality_name ?? locality}, filed ${new Date(r.created_at).toLocaleDateString('en-IN')}`)
      .join('\n');

    // STEP 4 — Claude Haiku dossier
    const swarmPrompt = `You are NammuruAI, a civic accountability platform in Bengaluru, India.
A cluster of ${reportCount} reports and ${upvoteCount} GPS-verified upvotes has
formed at ${locality}, ${wardName}.

Reports in this cluster:
${reportsSummary || '- (single lead report)'}

The authority of record is the ${corpName}, Greater Bengaluru Authority (GBA).
NOTE: BBMP was dissolved on 2 September 2025 and replaced by the GBA and its
city corporations. Address officials as the GBA corporation, not "BBMP zone".

Generate a swarm dossier. Respond with ONLY valid JSON, no markdown, no backticks:
{
  "location_summary": "One sentence describing the specific location",
  "dossier_summary": "Two-sentence briefing on the issue pattern and its impact",
  "formal_email_subject": "Subject line for a formal escalation email",
  "formal_email_body": "Formal letter body citing the Greater Bengaluru Governance Act 2024 and BBMP Act 1976 Section 58, referencing all ${reportCount} reports, requesting urgent action. Plain text, no markdown.",
  "tweet_primary": "Tweet under 270 chars with location, report count, and @GBA_office @ICCCBengaluru tags",
  "tweet_reply": "Follow-up tweet stating the statutory response deadline",
  "whatsapp_message": "WhatsApp message for an RWA group, casual tone, includes location and report count"
}`;

    let dossier: SwarmDossier;
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: swarmPrompt }],
      });
      const raw = response.content[0].type === 'text' ? response.content[0].text : '';
      const clean = raw.replace(/```json|```/g, '').trim();
      dossier = JSON.parse(clean) as SwarmDossier;
    } catch (err) {
      console.error('[create-swarm] dossier generation failed:', err);
      // Graceful fallback so the swarm still forms even if the model call fails.
      dossier = {
        location_summary: `${trigger.issue_type ?? 'Civic issue'} cluster at ${locality}, ${wardName}.`,
        dossier_summary: `${reportCount} reports and ${upvoteCount} upvotes corroborate a persistent ${trigger.issue_type ?? 'civic'} issue at ${locality}. The pattern indicates a systemic failure requiring corporation-level action.`,
        formal_email_subject: `Community escalation: ${reportCount} reports of ${trigger.issue_type ?? 'civic issue'} at ${locality}`,
        formal_email_body: `To the Commissioner, ${corpName}, Greater Bengaluru Authority,\n\nThis is a formal escalation on behalf of ${reportCount} citizens who have documented a recurring ${trigger.issue_type ?? 'civic'} issue at ${locality}, ${wardName}. Under the Greater Bengaluru Governance Act 2024 and BBMP Act 1976 Section 58, the authority is obligated to maintain public infrastructure. We request urgent remedial action.\n\nFiled via Nammooru.`,
        tweet_primary: `${reportCount} citizens reported ${trigger.issue_type ?? 'a civic issue'} at ${locality}. Pattern, not accident. @GBA_office @ICCCBengaluru must act.`,
        tweet_reply: `Statutory response is due within the SLA. We will escalate via RTI if there is no action. #Bengaluru #GBA`,
        whatsapp_message: `${reportCount} neighbours reported ${trigger.issue_type ?? 'an issue'} near ${locality}. Add your voice on Nammooru.`,
      };
    }

    // STEP 5 — insert swarm
    const { data: inserted, error: insertError } = await supabase
      .from('swarms')
      .insert({
        report_ids: reportIds,
        lead_report_id: trigger.id,
        location_summary: dossier.location_summary,
        ward_name: trigger.ward_name,
        issue_type: trigger.issue_type,
        severity: trigger.severity,
        report_count: reportCount,
        upvote_count: upvoteCount,
        signal_score: signalScore,
        formal_email: dossier.formal_email_body,
        tweet_thread: [
          { text: dossier.tweet_primary, type: 'primary' },
          { text: dossier.tweet_reply, type: 'reply' },
        ],
        whatsapp_message: dossier.whatsapp_message,
        dossier_summary: dossier.dossier_summary,
      } as never)
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('[create-swarm] insert failed:', insertError);
      return NextResponse.json({ error: 'Swarm insert failed' }, { status: 500 });
    }

    const swarmId = (inserted as { id: string }).id;

    // STEP 6 — escalation email to the verified email of record (best-effort)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails
        .send({
          from: FROM,
          to: VERIFIED_CHANNELS.emailOfRecord,
          subject: dossier.formal_email_subject,
          text: dossier.formal_email_body,
        })
        .catch((err) => console.warn('[create-swarm] swarm email non-fatal:', err));
    }

    return NextResponse.json({ success: true, swarm_id: swarmId, signal_score: signalScore });
  } catch (err) {
    console.error('[create-swarm] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
