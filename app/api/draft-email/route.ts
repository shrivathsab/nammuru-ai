import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

import { resolveWard } from '@/lib/wards'
import type { BengaluruZone } from '@/lib/types'

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

// ─── Zone commissioner emails ─────────────────────────────────────────────────

const ZONE_COMMISSIONER_EMAILS: Record<BengaluruZone, string> = {
  South:        'bbmp.south@bbmp.gov.in',
  East:         'bbmp.east@bbmp.gov.in',
  West:         'bbmp.west@bbmp.gov.in',
  North:        'bbmp.north@bbmp.gov.in',
  Central:      'bbmp.central@bbmp.gov.in',
  Bommanahalli: 'bbmp.bommanahalli@bbmp.gov.in',
  Dasarahalli:  'bbmp.dasarahalli@bbmp.gov.in',
  'RR Nagar':   'bbmp.rrnagar@bbmp.gov.in',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraftEmailRequest {
  issue_type: string
  severity: string
  triage_level: number
  triage_label: string
  description: string
  locality: string
  ward_name: string
  ward_zone: string
  nearest_landmark: string | null
  pincode: string | null
  lat: number
  lng: number
  cluster_count: number
  cluster_suggested_action: string | null
  report_hash: string
}

export interface DraftEmailResponse {
  subject: string
  subject_kannada: string
  body: string
  recipient_name: string
  recipient_email: string
  cc_emails: string[]
  report_id: string
  google_maps_url: string
}

// ─── Fallback email (no Claude) ───────────────────────────────────────────────

function buildFallbackEmail(
  reportId: string,
  req: DraftEmailRequest,
  recipientName: string,
  googleMapsUrl: string,
): string {
  const deadlineMap: Record<number, string> = { 1: '48 hours', 2: '7 days', 3: '30 days' }
  const deadline = deadlineMap[req.triage_level] ?? '7 days'

  const legalRef =
    req.issue_type === 'Garbage'
      ? 'BBMP Solid Waste Management Rules 2016'
      : 'BBMP Act 1976, Section 58 (Maintenance of Roads and Public Infrastructure)'

  const communityLine =
    req.cluster_count > 1
      ? `\nThis issue has been independently reported by ${req.cluster_count} citizens at this location within the past 7 days, indicating a systemic problem requiring immediate intervention.\n`
      : ''

  const landmarkLine = req.nearest_landmark ? `\nNearest Landmark: Near ${req.nearest_landmark}` : ''
  const pincodeDisplay = req.pincode ? `, PIN ${req.pincode}` : ''
  const rootCauseLine = req.cluster_suggested_action
    ? `\nRoot Cause Assessment: ${req.cluster_suggested_action}\n`
    : ''

  return `Dear ${recipientName},

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

We trust this matter will receive your immediate attention. This report has been filed on the NammuruAI civic platform and is publicly documented. We reserve the right to escalate via RTI if no action is taken within the stated timeframe.

Concerned Citizen of Bengaluru
Filed via NammuruAI Civic Platform
Report ID: ${reportId}`
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

    const req = body as DraftEmailRequest

    // STEP 1: Generate report ID
    const reportId =
      'NMR-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      req.report_hash.slice(0, 4).toUpperCase()

    // STEP 2: Resolve ward officer
    const ward = resolveWard(req.locality)
    const recipientName = ward.officer_name
    const recipientEmail = ward.officer_email

    // CC: zone commissioner + grievance (deduplicated)
    const zoneEmail = ZONE_COMMISSIONER_EMAILS[ward.zone] ?? 'bbmp.central@bbmp.gov.in'
    const ccEmails = Array.from(new Set([zoneEmail, 'grievance@bbmp.gov.in']))

    // STEP 3: Google Maps URL
    const googleMapsUrl = `https://maps.google.com/?q=${req.lat},${req.lng}`

    // STEP 4: Draft email body via Claude
    let emailBody: string

    try {
      const anthropic = new Anthropic()

      const userMessage = `Draft a formal grievance email with these exact details:

Recipient: ${recipientName}, Ward Officer — ${req.ward_name}
Report ID: ${reportId}
Issue: ${req.issue_type} — ${req.severity} severity (Triage Level: ${req.triage_label})
Location: ${req.locality}, ${req.ward_name}, ${req.ward_zone} Zone, Bengaluru${req.pincode ? `\nPincode: ${req.pincode}` : ''}${req.nearest_landmark ? `\nNearest landmark: Near ${req.nearest_landmark}` : ''}
GPS Coordinates: ${req.lat}, ${req.lng}
Google Maps: ${googleMapsUrl}${req.cluster_count > 1 ? `\nCommunity reports: ${req.cluster_count} citizens have reported this issue at this location in the past 7 days.` : ''}${req.cluster_suggested_action ? `\nRoot cause note: ${req.cluster_suggested_action}` : ''}
Issue description: ${req.description}

The email must include:

Opening: State the issue, location, and report ID clearly
Evidence: Mention GPS coordinates, photo evidence, and community report count if > 1
Legal obligation: Reference BBMP Act 1976 Section 58 (maintenance of roads) or BBMP Solid Waste Management Rules 2016 (for garbage issues). Use the correct reference for the issue type: ${req.issue_type}
Demand: Specific action required within:
- 48 hours for Triage Level 1 (Urgent)
- 7 days for Triage Level 2 (Medium)
- 30 days for Triage Level 3 (Routine)
Closing: "We trust this matter will receive your immediate attention. This report has been filed on the NammuruAI civic platform and is publicly documented. We reserve the right to escalate via RTI if no action is taken within the stated timeframe."
Sign off: "Concerned Citizen of Bengaluru\nFiled via NammuruAI Civic Platform\nReport ID: ${reportId}"

Keep the tone formal and factual throughout. Do not use emotional language. Legal references add credibility — include them.`

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system:
          'You are a formal legal letter writer for Indian civic grievances. Write formal, measured, professional letters. No emotional language. No dramatic phrases. Cite facts and legal obligations only. The tone is: respectful, firm, specific, deadline-driven. Return ONLY the email body text — no subject line, no salutation header, start directly with "Dear [Officer Name],"\n\nUse plain text only. No markdown formatting whatsoever.\nNo asterisks, no hashes, no dashes for bullets, no backticks.\nUse blank lines between paragraphs.\nUse ALL CAPS for section headers if needed (e.g. EVIDENCE, LEGAL OBLIGATION, DEMAND).',
        messages: [{ role: 'user', content: userMessage }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      emailBody = rawText.trim() || buildFallbackEmail(reportId, req, recipientName, googleMapsUrl)
    } catch {
      emailBody = buildFallbackEmail(reportId, req, recipientName, googleMapsUrl)
    }

    // STEP 5: Subject lines
    const subject = `[Report ${reportId}] ${req.triage_label}: ${req.issue_type} at ${req.locality} — Action Required`
    const subjectKannada = `ವರದಿ ${reportId}: ${req.locality}ದಲ್ಲಿ ${req.issue_type} — ತಕ್ಷಣ ಕ್ರಮ ಅಗತ್ಯ`

    // STEP 6: Return response
    const responseBody: DraftEmailResponse = {
      subject,
      subject_kannada: subjectKannada,
      body: emailBody,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      cc_emails: ccEmails,
      report_id: reportId,
      google_maps_url: googleMapsUrl,
    }

    return NextResponse.json(responseBody)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
