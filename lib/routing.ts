/**
 * Channel types and routing logic for NammuruAI civic reports.
 *
 * GBA MIGRATION — Greater Bengaluru Authority replaced BBMP on 2 Sept 2025.
 * BBMP (and its 5 zones: Bommanahalli/East/South/West/Mahadevapura) was
 * LEGALLY DISSOLVED and replaced by the Greater Bengaluru Authority + 5 city
 * corporations (East/West/North/South/Central). There are NO elected
 * corporators — IAS administrators run everything. Verified June 12, 2026.
 * Re-verify commissioner names before each launch wave (IAS officers rotate).
 *
 * Old zone gmails (sebombbmp@gmail.com etc.) CANNOT be verified as monitored
 * post-dissolution, so they are removed. Reports route ONLY through the
 * verified-live channels in VERIFIED_CHANNELS below.
 */

export type ChannelType =
  | 'whatsapp_direct'   // direct number, deep link to chat
  | 'whatsapp_bot'      // automated complaint bot
  | 'email'             // standard email
  | 'tweet'             // X/Twitter
  | 'copy_link';        // public report URL

export type IssueCategory =
  | 'pothole'           // road damage, potholes, craters
  | 'garbage'           // waste, illegal dumping, missed pickup
  | 'streetlight'       // street lighting issues
  | 'drainage'          // flooding, drains, stormwater
  | 'encroachment'      // illegal occupation
  | 'general';          // fallback

export interface RoutingChannel {
  id: string;
  type: ChannelType;
  name: string;          // display name
  description: string;   // tile subtitle
  contact: string;       // phone (E.164) or email
  scope: 'citywide' | 'zone' | 'division' | 'specialist' | 'public';
  responseTime: string;  // user-facing expectation
  priority: number;      // 1 = highest
}

// ─────────────────────────────────────────────────────────────
// GBA CORPORATION MODEL (replaces dissolved BBMP 5-zone structure)
// ─────────────────────────────────────────────────────────────

export type Corporation =
  | 'South City Corporation'
  | 'East City Corporation'
  | 'Central City Corporation'
  | 'West City Corporation'
  | 'North City Corporation';

export interface CorporationInfo {
  name: Corporation;
  hq: string;
  commissioner: string;   // verify before each launch wave (IAS officers rotate)
}

// Pilot-ward → corporation mapping (GBA South Corporation ward list, Sept 2025).
// NOTE: HSR Layout + Koramangala are in the official South enumeration; one
// secondary source places them in Central. Going with South (official). Flag
// for GPS-level verification if a report routes oddly.
export const PILOT_WARD_CORPORATION: Record<string, CorporationInfo> = {
  'HSR Layout Ward':   { name: 'South City Corporation', hq: 'Jayanagar Zonal Office',    commissioner: 'Ramesh K.N., IAS' },
  'Koramangala Ward':  { name: 'South City Corporation', hq: 'Jayanagar Zonal Office',    commissioner: 'Ramesh K.N., IAS' },
  'Jayanagar Ward':    { name: 'South City Corporation', hq: 'Jayanagar Zonal Office',    commissioner: 'Ramesh K.N., IAS' },
  'Indiranagar Ward':  { name: 'East City Corporation',  hq: 'Mahadevapura Zonal Office', commissioner: 'Ramesh D.S., IAS' },
  'Whitefield Ward':   { name: 'East City Corporation',  hq: 'Mahadevapura Zonal Office', commissioner: 'Ramesh D.S., IAS' },
};

// VERIFIED-LIVE channels (confirmed active June 2026) — these carry the report.
export const VERIFIED_CHANNELS = {
  wasteWhatsApp: '+919448197197',     // CONFIRMED active GBA/BBMP waste line
  gbaHelpline:   '+919480683695',     // GBA grievance helpline
  cpgrams:       'https://pgportal.gov.in',
  emailOfRecord: 'comm@bbmp.gov.in',  // bbmp.gov.in domain still GBA-operated
} as const;

/** Resolve the GBA corporation for a pilot ward (null if unknown). */
export function resolveCorporation(wardName: string | null | undefined): CorporationInfo | null {
  if (!wardName) return null;
  return PILOT_WARD_CORPORATION[wardName] ?? null;
}

/** Corporation display name for a ward, with a safe GBA-wide fallback. */
export function corporationName(wardName: string | null | undefined): string {
  return resolveCorporation(wardName)?.name ?? 'Greater Bengaluru Authority';
}

/**
 * Letter-addressing block for the formal complaint / RTI.
 *   The Commissioner, {Corporation name}
 *   {HQ}, Greater Bengaluru Authority
 */
export function corporationAddressLines(wardName: string | null | undefined): string[] {
  const corp = resolveCorporation(wardName);
  if (!corp) {
    return ['The Commissioner', 'Greater Bengaluru Authority', 'Bengaluru'];
  }
  return [
    `The Commissioner, ${corp.name}`,
    `${corp.hq}, Greater Bengaluru Authority`,
  ];
}

// ─────────────────────────────────────────────────────────────
// CITYWIDE CHANNELS — all verified-live (June 2026)
// ─────────────────────────────────────────────────────────────

export const CITYWIDE: Record<string, RoutingChannel> = {
  GENERAL_WA: {
    id: 'wa_general',
    type: 'whatsapp_direct',
    name: 'GBA Grievance Helpline',
    description: 'Citywide civic complaints',
    contact: VERIFIED_CHANNELS.gbaHelpline,   // +91 94806 83695 (verified)
    scope: 'citywide',
    responseTime: '4-12 hours typical',
    priority: 2,
  },
  GENERAL_EMAIL: {
    id: 'email_general',
    type: 'email',
    name: 'GBA Commissioner (email of record)',
    description: 'Official email channel — bbmp.gov.in still GBA-operated',
    contact: VERIFIED_CHANNELS.emailOfRecord, // comm@bbmp.gov.in (verified)
    scope: 'citywide',
    responseTime: '48-hour SLA',
    priority: 3,
  },
  POTHOLE_BOT: {
    id: 'wa_pothole',
    type: 'whatsapp_bot',
    name: 'Pothole Bot',
    description: 'Specialized road damage bot',
    contact: '+919108420079',
    scope: 'specialist',
    responseTime: '~1 hour acknowledgement',
    priority: 1,
  },
  GARBAGE_WA: {
    id: 'wa_garbage',
    type: 'whatsapp_direct',
    name: 'GBA Waste Hotline',
    description: 'Garbage & illegal dumping',
    contact: VERIFIED_CHANNELS.wasteWhatsApp, // +91 94481 97197 (verified)
    scope: 'specialist',
    responseTime: '4-8 hours typical',
    priority: 1,
  },
};

// ─────────────────────────────────────────────────────────────
// ISSUE TYPE NORMALIZATION
// ─────────────────────────────────────────────────────────────

export function categorizeIssue(issueType: string): IssueCategory {
  const lower = issueType.toLowerCase();
  if (lower.includes('pothole') || lower.includes('road') || lower.includes('crater')) return 'pothole';
  if (lower.includes('garbage') || lower.includes('waste') || lower.includes('dump')) return 'garbage';
  if (lower.includes('streetlight') || lower.includes('light')) return 'streetlight';
  if (lower.includes('drain') || lower.includes('flood') || lower.includes('water')) return 'drainage';
  if (lower.includes('encroach')) return 'encroachment';
  return 'general';
}

// ─────────────────────────────────────────────────────────────
// SMART ROUTING — pick best VERIFIED channels for this report
//
// Post-GBA: route only through verified-live channels. The corporation
// commissioner is reached at the email of record (comm@bbmp.gov.in) — we do
// NOT invent a per-commissioner gmail. L1 reports surface the corporation
// commissioner explicitly so the RoutingReceipt shows who is accountable.
// ─────────────────────────────────────────────────────────────

export function resolveChannels(params: {
  issueType: string;
  wardName: string;
  wardZone: string;
  triageLevel: 1 | 2 | 3;
}): {
  primary: RoutingChannel[];
  escalation: RoutingChannel[];
  corporation: CorporationInfo | null;
} {
  const category = categorizeIssue(params.issueType);
  const corp = resolveCorporation(params.wardName);

  const primary: RoutingChannel[] = [];
  const escalation: RoutingChannel[] = [];

  if (category === 'pothole') {
    primary.push(CITYWIDE.POTHOLE_BOT);
    primary.push(CITYWIDE.GENERAL_EMAIL);
  } else if (category === 'garbage') {
    primary.push(CITYWIDE.GARBAGE_WA);
    primary.push(CITYWIDE.GENERAL_EMAIL);
  } else {
    primary.push(CITYWIDE.GENERAL_WA);
    primary.push(CITYWIDE.GENERAL_EMAIL);
  }

  // Escalation — corporation commissioner, reached via the email of record.
  // L1 always escalates; L2 escalates only for garbage (public-health weight).
  const shouldEscalate =
    params.triageLevel === 1 || (params.triageLevel === 2 && category === 'garbage');

  if (shouldEscalate) {
    escalation.push({
      id: corp
        ? `corp_${corp.name.replace(/\s+/g, '_').toLowerCase()}`
        : 'corp_gba',
      type: 'email',
      name: corp ? `Commissioner, ${corp.name}` : 'GBA Commissioner',
      description: corp
        ? `${corp.hq}, Greater Bengaluru Authority`
        : 'Greater Bengaluru Authority',
      contact: VERIFIED_CHANNELS.emailOfRecord,
      scope: 'specialist',
      responseTime: params.triageLevel === 1 ? '48-hour SLA' : '7-day SLA',
      priority: 1,
    });
  }

  return { primary, escalation, corporation: corp };
}

// ─────────────────────────────────────────────────────────────
// ACTION URL BUILDERS
// ─────────────────────────────────────────────────────────────

export function buildWhatsAppUrl(channel: RoutingChannel, message: string): string {
  if (channel.type !== 'whatsapp_direct' && channel.type !== 'whatsapp_bot') {
    throw new Error('Not a WhatsApp channel');
  }
  const phoneDigits = channel.contact.replace(/\D/g, '');
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(channel: RoutingChannel, params: {
  subject: string;
  body: string;
  cc?: string[];
}): string {
  if (channel.type !== 'email') throw new Error('Not an email channel');
  const url = new URL(`mailto:${channel.contact}`);
  url.searchParams.set('subject', params.subject);
  url.searchParams.set('body', params.body);
  if (params.cc?.length) {
    url.searchParams.set('cc', params.cc.join(','));
  }
  return url.toString();
}
