import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

import { resolveWard } from '@/lib/wards'
import { reportUrl } from '@/lib/config'
import type { DraftContentRequest, DraftContentResponse } from '@/lib/types'

// ─── Rate limit ───────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 5) return true
  entry.count += 1
  return false
}

// ─── Legal reference ──────────────────────────────────────────────────────────

function legalReferenceFor(issueType: string): string {
  const t = issueType.toLowerCase()
  if (t.includes('pothole') || t.includes('road')) {
    return 'BBMP Act 1976 Section 58 (maintenance of roads)'
  }
  if (t.includes('garbage') || t.includes('waste')) {
    return 'BBMP Solid Waste Management Rules 2016'
  }
  if (t.includes('streetlight') || t.includes('light')) {
    return 'BBMP street lighting obligations under municipal law'
  }
  if (t.includes('encroach')) {
    return 'BBMP Act enforcement provisions for encroachments'
  }
  return 'BBMP Act 1976 and applicable municipal regulations'
}

// ─── Deadline ─────────────────────────────────────────────────────────────────

function deadlineFor(level: number): string {
  if (level === 1) return '48 hours (Level 1 URGENT)'
  if (level === 2) return '7 days (Level 2 MEDIUM)'
  return '30 days (Level 3 ROUTINE)'
}

function deadlineShort(level: number): string {
  if (level === 1) return '48 hours'
  if (level === 2) return '7 days'
  return '30 days'
}

// ─── Handle & hashtag lookup tables (verified active 2026) ────────────────────

// Zone → Zonal Commissioner handle (verified active 2026)
const ZONE_HANDLES: Record<string, string> = {
  'Bommanahalli': '@ZC_Bommanahalli',
  'South':        '@comm_blr_south',
  'East':         '@BbmpEast',
}

// Issue type → specialist handle + hashtags (verified active 2026)
const ISSUE_HANDLES: Record<string, { handle: string; hashtag: string }> = {
  'Pothole':      { handle: '@GBA_office', hashtag: '#BBMPPotholes #FixBengaluruRoads #PotholeFreeBengaluru' },
  'Road':         { handle: '@GBA_office', hashtag: '#BBMPPotholes #FixBengaluruRoads #RoadRepair'          },
  'Garbage':      { handle: '@BBMPSWMSplComm', hashtag: '#BBMPGarbage #SwachhBengaluru #SolidWaste'        },
  'Streetlight':  { handle: '@GBA_office', hashtag: '#BBMPStreetlights #FixStreetLights'                   },
  'Encroachment': { handle: '@GBA_office', hashtag: '#BBMPEncroachment #RemoveEncroachment'                },
}

// Triage level → escalation handles
const TRIAGE_HANDLES: Record<number, string> = {
  1: '@GBAChiefComm @GBA_office @ICCCBengaluru @bbmpcommr',
  2: '@GBA_office @ICCCBengaluru',
  3: '@GBA_office @ICCCBengaluru',
}

// Always included on every tweet
const GENERAL_HANDLES = '@GBA_office @ICCCBengaluru'

// ─── Fallback content (no Claude) ─────────────────────────────────────────────

function buildFallbackEmailBody(
  reportId: string,
  req: DraftContentRequest,
  recipientName: string,
  googleMapsUrl: string,
): string {
  const legalRef = legalReferenceFor(req.issue_type)
  const deadline = deadlineShort(req.triage_level)
  const landmarkLine = req.nearest_landmark ? `\nNearest Landmark: Near ${req.nearest_landmark}` : ''
  const pincodeDisplay = req.pincode ? `, PIN ${req.pincode}` : ''
  const communityLine =
    req.cluster_count > 1
      ? `\nThis issue has been independently reported by ${req.cluster_count} citizens at this location within the past 7 days.\n`
      : ''
  const rootCauseLine = req.cluster_suggested_action
    ? `\nRoot Cause Assessment: ${req.cluster_suggested_action}\n`
    : ''

  return `TEMPLATE DRAFT — Claude API unavailable.

Dear ${recipientName},

I am writing to formally report a civic infrastructure issue requiring your urgent attention under your jurisdiction.

Report Reference: ${reportId}
Issue Category: ${req.issue_type} (Severity: ${req.severity.toUpperCase()} — Triage Level: ${req.triage_label})
Location: ${req.locality}, ${req.ward_name}, ${req.ward_zone} Zone, Bengaluru${pincodeDisplay}${landmarkLine}
GPS Coordinates: ${req.lat}, ${req.lng}
Google Maps: ${googleMapsUrl}
${communityLine}
Issue Description:
${req.description}
${rootCauseLine}
Photographic evidence has been attached to this report and is publicly documented on the NammuruAI civic platform.

As per ${legalRef}, the BBMP is legally obligated to maintain public infrastructure in a safe and serviceable condition. This report constitutes formal notice of a breach of that obligation.

I respectfully request that the necessary remedial action be taken within ${deadline} of receipt of this communication.

We trust this matter will receive your immediate attention. This report has been filed on the NammuruAI civic platform and is publicly documented at ${reportUrl(reportId)}. We reserve the right to escalate via RTI if no action is taken within the stated timeframe.

Concerned Citizen of Bengaluru
Filed via NammuruAI Civic Platform
Report ID: ${reportId}
Public record: ${reportUrl(reportId)}`
}

function buildFallbackTweets(reportId: string, req: DraftContentRequest): {
  primary: string
  reply_evidence: string
  reply_escalation: string
} {
  const primary = `${req.issue_type} reported at ${req.locality}, ${req.ward_name}. Filed on NammuruAI (${req.triage_label}). Report ${reportId}: ${reportUrl(reportId)}`
  const evidence =
    req.cluster_count > 1
      ? `${req.cluster_count} citizens have reported this location in the last 7 days. GPS: ${req.lat}, ${req.lng}.`
      : `GPS: ${req.lat}, ${req.lng}. Photo evidence attached on the public record.`
  const escalation = `If no action within ${deadlineShort(req.triage_level)}, we will escalate via RTI. Public record: ${reportUrl(reportId)}`
  return { primary, reply_evidence: evidence, reply_escalation: escalation }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const body: unknown = await request.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      !('issue_type' in body) ||
      !('severity' in body) ||
      !('triage_level' in body) ||
      !('triage_label' in body) ||
      !('description' in body) ||
      !('locality' in body) ||
      !('ward_name' in body) ||
      !('ward_zone' in body) ||
      !('lat' in body) ||
      !('lng' in body) ||
      !('cluster_count' in body) ||
      !('report_hash' in body) ||
      typeof (body as Record<string, unknown>).lat !== 'number' ||
      typeof (body as Record<string, unknown>).lng !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const req = body as DraftContentRequest
    const {
      issue_type,
      severity,
      triage_level,
      triage_label,
      description,
      locality,
      ward_name,
      ward_zone,
      nearest_landmark,
      pincode,
      lat,
      lng,
      cluster_count,
      cluster_suggested_action,
      report_hash,
    } = req

    // STEP 2: Report ID
    const reportId =
      'NMR-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      report_hash.slice(0, 4).toUpperCase()

    // STEP 3: Resolve ward officer
    const ward = resolveWard(locality)
    const recipientName = ward.officer_name
    const recipientEmail = ward.officer_email
    const ccEmails = [
      `bbmp.${ward.zone.toLowerCase()}@bbmp.gov.in`,
      'grievance@bbmp.gov.in',
    ]

    // STEP 4: Google Maps URL
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`

    // Resolve handles + hashtags for this report
    const zoneHandle    = ZONE_HANDLES[ward_zone]      ?? '@GBA_office'
    const issueHandle   = ISSUE_HANDLES[issue_type]?.handle   ?? '@GBA_office'
    const issueHashtag  = ISSUE_HANDLES[issue_type]?.hashtag  ?? '#BBMPIssues'
    const triageHandles = TRIAGE_HANDLES[triage_level] ?? '@GBA_office'

    const allHandles = [...new Set([
      ...triageHandles.split(' '),
      zoneHandle,
      issueHandle,
      ...GENERAL_HANDLES.split(' '),
    ].filter(h => h.startsWith('@')))].join(' ')

    const allHashtags = `#Bengaluru #GBA #BBMP ${issueHashtag}`

    const fixedCost = 23 + 23 + 3 + 3 + allHandles.length +
                      allHashtags.length + 10
    const descriptionBudget = 280 - fixedCost

    // STEP 5: Combined Claude call
    let emailBody: string
    let tweetPrimary: string
    let tweetReplyEvidence: string
    let tweetReplyEscalation: string

    try {
      const anthropic = new Anthropic()

      const systemPrompt = `You are a dual-output civic communication writer for NammuruAI,
a civic reporting platform in Bengaluru, India.

You write TWO things simultaneously from the same civic report data:

OUTPUT 1 — FORMAL LEGAL LETTER:
Formal, measured, professional. No emotional language. No markdown.
No asterisks, hashes, bullet dashes, or backticks.
Use plain text only. Use blank lines between paragraphs.
Use ALL CAPS for section headers if needed.
Cite facts and legal obligations only.
Tone: respectful, firm, specific, deadline-driven.
Start directly with "Dear [Officer Name],"

OUTPUT 2 — PUBLIC TWEET:
Write like an informed, concerned Bengaluru citizen.
Civic urgency — factual but human. Max 240 characters.
Must include: issue type, locality, report ID, public URL.
Format: one punchy tweet. No hashtag spam. Maximum 2 hashtags.
Do NOT auto-tag @BBMP_OFFICIAL — leave that to the user.
Public URL format: ${reportUrl('[reportId]')}

Return ONLY valid JSON. No markdown. No backticks. No preamble.`

      const userMessage = `Generate both outputs for this civic report:

Recipient: ${recipientName}, Ward Officer — ${ward_name}
Report ID: ${reportId}
Issue: ${issue_type} — ${severity} severity (Triage: ${triage_label})
Location: ${locality}, ${ward_name}, ${ward_zone} Zone, Bengaluru
${pincode ? 'Pincode: ' + pincode : ''}
${nearest_landmark ? 'Nearest landmark: ' + nearest_landmark : ''}
GPS: ${lat}, ${lng}
Google Maps: ${googleMapsUrl}
${cluster_count > 1 ? `Community reports: ${cluster_count} citizens reported this location in the last 7 days.` : ''}
${cluster_suggested_action ? 'Root cause note: ' + cluster_suggested_action : ''}
Issue description: ${description}

DEADLINE:
${deadlineFor(triage_level)}

LEGAL REFERENCE:
${legalReferenceFor(issue_type)}

EMAIL must include:
1. Opening: issue, location, report ID
2. Evidence: GPS coordinates, photo evidence, community count if > 1
3. Legal obligation: cite the legal reference above
4. Demand: specific action within the deadline stated above
5. Closing: "We trust this matter will receive your immediate
   attention. This report has been filed on the NammuruAI civic
   platform and is publicly documented at
   ${reportUrl(reportId)}. We reserve the right to escalate
   via RTI if no action is taken within the stated timeframe."
6. Sign-off:
   "Concerned Citizen of Bengaluru
   Filed via NammuruAI Civic Platform
   Report ID: ${reportId}
   Public record: ${reportUrl(reportId)}"

TWEET STRICT CHARACTER BUDGET — Twitter limit is 280 chars total.
Twitter auto-shortens ALL URLs to exactly 23 chars (t.co wrapping).

Fixed costs you cannot change:
  Maps URL:      23 chars  (always present)
  Report URL:    23 chars  (always present)
  " 📍 ":         3 chars
  " 📋 ":         3 chars
  Handles:       count actual chars of: ${allHandles}
  Hashtags:      count actual chars of: ${allHashtags}
  Spaces:        ~10 chars

Calculate fixed cost:
  fixed = 23 + 23 + 3 + 3 + ${allHandles.length} +
          ${allHashtags.length} + 10

Your description budget = 280 - fixed chars
Your description must be ${descriptionBudget} characters or fewer.
Count carefully before finalising.
Write the description to fit EXACTLY within that budget.
Be ruthless — cut adjectives, cut details, keep only:
  verb + issue type + location + deadline

GOOD (concise):
  "🚨 Waste dumping blocking footpath at Hoodi. 7-day deadline."

BAD (too verbose):
  "🚨 Illegal waste dumping blocking footpath at Hoodi, Whitefield.
   Construction debris, concrete slabs, metal wiring scattered.
   Public hazard. 7-day response deadline."

Tweet format (strict order):
[emoji] [verb] [issue] at [locality]. [deadline].
📍 ${googleMapsUrl}
📋 ${reportUrl(reportId)}
${allHandles}
${allHashtags}

REPLY TWEET 2 (escalation):
Mention that if no response within the deadline, RTI under
RTI Act 2005 will be filed. Tag @BBMP_OFFICIAL if not already
in primary tweet. Keep under 240 chars.

Return this exact JSON structure:
{
  "email_body": "full plain text email body here",
  "tweet_primary": "one tweet under 240 chars",
  "tweet_reply_evidence": "optional follow-up tweet with GPS + cluster data",
  "tweet_reply_escalation": "optional follow-up tweet mentioning RTI escalation path"
}`

      const data = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      // STEP 6: Parse Claude response
      const raw = data.content[0].type === 'text' ? data.content[0].text : ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as {
        email_body: string
        tweet_primary: string
        tweet_reply_evidence: string
        tweet_reply_escalation: string
      }

      emailBody = parsed.email_body
      tweetPrimary = parsed.tweet_primary
      tweetReplyEvidence = parsed.tweet_reply_evidence
      tweetReplyEscalation = parsed.tweet_reply_escalation
    } catch {
      emailBody = buildFallbackEmailBody(reportId, req, recipientName, googleMapsUrl)
      const fb = buildFallbackTweets(reportId, req)
      tweetPrimary = fb.primary
      tweetReplyEvidence = fb.reply_evidence
      tweetReplyEscalation = fb.reply_escalation
    }

    // STEP 7: Subject lines
    const subject = `[Report ${reportId}] ${triage_label}: ${issue_type} at ${locality} — Action Required`
    const subjectKannada = `ವರದಿ ${reportId}: ${locality}ದಲ್ಲಿ ${issue_type} — ತಕ್ಷಣ ಕ್ರಮ ಅಗತ್ಯ`

    // STEP 8: Return
    return NextResponse.json({
      subject,
      subject_kannada: subjectKannada,
      body: emailBody,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      cc_emails: ccEmails,
      report_id: reportId,
      google_maps_url: googleMapsUrl,
      tweet: {
        primary: tweetPrimary,
        reply_evidence: tweetReplyEvidence,
        reply_escalation: tweetReplyEscalation,
      },
    } satisfies DraftContentResponse)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
