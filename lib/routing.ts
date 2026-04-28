/**
 * Channel types and routing logic for NammuruAI civic reports.
 * Source: BBMP official SWM contacts (Nov 2025)
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
// CITYWIDE CHANNELS — always available
// ─────────────────────────────────────────────────────────────

export const CITYWIDE: Record<string, RoutingChannel> = {
  GENERAL_WA: {
    id: 'wa_general',
    type: 'whatsapp_direct',
    name: 'BBMP Complaint Line',
    description: 'Citywide civic complaints',
    contact: '+919480685700',
    scope: 'citywide',
    responseTime: '4-12 hours typical',
    priority: 2,
  },
  GENERAL_EMAIL: {
    id: 'email_general',
    type: 'email',
    name: 'BBMP Commissioner',
    description: 'Official email channel',
    contact: 'comm@bbmp.gov.in',
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
    name: 'BBMP Waste Hotline',
    description: 'Garbage & illegal dumping',
    contact: '+919448197197',
    scope: 'specialist',
    responseTime: '4-8 hours typical',
    priority: 1,
  },
};

// ─────────────────────────────────────────────────────────────
// SWM HEAD OFFICE — escalation channels
// ─────────────────────────────────────────────────────────────

export const SWM_HEAD: Record<string, RoutingChannel> = {
  SPECIAL_COMMR: {
    id: 'email_swm_special',
    type: 'email',
    name: 'SWM Special Commissioner',
    description: 'BBMP head office',
    contact: 'specialswmbbmp@gmail.com',
    scope: 'specialist',
    responseTime: '5-7 day escalation',
    priority: 4,
  },
  JC_SWM: {
    id: 'email_swm_jc',
    type: 'email',
    name: 'SWM Joint Commissioner',
    description: 'Escalation contact',
    contact: 'jcswmbbmp@gmail.com',
    scope: 'specialist',
    responseTime: '5-7 day escalation',
    priority: 4,
  },
  CHIEF_ENG: {
    id: 'email_swm_ce',
    type: 'email',
    name: 'SWM Chief Engineer',
    description: 'Technical escalation',
    contact: 'ceswm2@gmail.com',
    scope: 'specialist',
    responseTime: '5-7 day escalation',
    priority: 5,
  },
};

// ─────────────────────────────────────────────────────────────
// ZONE SE EMAILS (5 BBMP zones)
// ─────────────────────────────────────────────────────────────

export const ZONE_SE: Record<string, RoutingChannel> = {
  'Bommanahalli': {
    id: 'zone_bommanahalli',
    type: 'email',
    name: 'Bommanahalli Zone SE',
    description: 'Zone-level Solid Waste',
    contact: 'sebombbmp@gmail.com',
    scope: 'zone',
    responseTime: '2-3 day response',
    priority: 3,
  },
  'East': {
    id: 'zone_east',
    type: 'email',
    name: 'East Zone SE',
    description: 'Zone-level Solid Waste',
    contact: 'bbmpseeast@gmail.com',
    scope: 'zone',
    responseTime: '2-3 day response',
    priority: 3,
  },
  'Mahadevapura': {
    id: 'zone_mahadevapura',
    type: 'email',
    name: 'Mahadevapura Zone SE',
    description: 'Zone-level Solid Waste',
    contact: 'semdpura@gmail.com',
    scope: 'zone',
    responseTime: '2-3 day response',
    priority: 3,
  },
  'South': {
    id: 'zone_south',
    type: 'email',
    name: 'South Zone SE',
    description: 'Zone-level Solid Waste',
    contact: 'sesouthbbmp@gmail.com',
    scope: 'zone',
    responseTime: '2-3 day response',
    priority: 3,
  },
  'West': {
    id: 'zone_west',
    type: 'email',
    name: 'West Zone SE',
    description: 'Zone-level Solid Waste',
    contact: 'sebbmpwest123@gmail.com',
    scope: 'zone',
    responseTime: '2-3 day response',
    priority: 3,
  },
};

// ─────────────────────────────────────────────────────────────
// DIVISION SWM EMAILS (30+ divisions)
// ─────────────────────────────────────────────────────────────

export const DIVISION_SWM: Record<string, { email: string; mobile?: string }> = {
  'Byatarayanapura':    { email: 'bbmpaeeswmbtp@gmail.com',         mobile: '+919480688500' },
  'Yelahanka':          { email: 'aeeswm.yelahanka2@gmail.com',     mobile: '+919480688499' },
  'Bengaluru South':    { email: 'aeeswm.bengalurusouth@gmail.com', mobile: '+919480688524' },
  'Bommanahalli':       { email: 'aeeswm.bommanahalli@gmail.com',   mobile: '+919480688524' },
  'Dasarahalli':        { email: 'bbmpsedas@gmail.com',             mobile: '+919986078152' },
  'C.V. Raman Nagar':   { email: 'aeeswmcvr@gmail.com',             mobile: '+919945689355' },
  'Hebbal':             { email: 'aeeswm.hebbal1@gmail.com',        mobile: '+919480688502' },
  'Sarvajna Nagar':     { email: 'aeeswm.sarvagnanagar@gmail.com',  mobile: '+919632709988' },
  'Shanti Nagar':       { email: 'aeeswm.shanthinagar@gmail.com',   mobile: '+918147194915' },
  'Shivaji Nagar':      { email: 'aeeswmshivajinagar1@gmail.com',   mobile: '+918147194915' },
  'Pulikeshi Nagar':    { email: 'aeeswm.pulakeshinagar@gmail.com', mobile: '+919886638403' },
  'K.R. Puram':         { email: 'aeeswm.krpura36@gmail.com',       mobile: '+919480688516' },
  'Mahadevapura':       { email: 'swm.mahadevapura@gmail.com',      mobile: '+919480688517' },
  'Kengeri':            { email: 'aeeswm.yeshwantpur@gmail.com',    mobile: '+919480688509' },
  'Rajarajeshwari Nagar': { email: 'aeeswm.rrnagar1@gmail.com',     mobile: '+919480688508' },
  'Basavanagudi':       { email: 'aeeswm.basavanagudi@gmail.com',   mobile: '+919480685594' },
  'BTM Layout':         { email: 'btmswmcell@gmail.com',            mobile: '+919845807141' },
  'Chikpete':           { email: 'aeeswm.chickpete@gmail.com',      mobile: '+919845807141' },
  'Jayanagar':          { email: 'aeeswm.jayanagar@gmail.com',      mobile: '+919632612299' },
  'Padmanabhanagar':    { email: 'aeeswm.padmanabhnagar@gmail.com', mobile: '+917259367289' },
  'Vijay Nagar':        { email: 'aeeswm.vijaynagar@gmail.com',     mobile: '+919036567996' },
  'Chamarajpete':       { email: 'aeeswm.chamarajpete1@gmail.com',  mobile: '+919986957606' },
  'Gandhi Nagar':       { email: 'eocottonpet@gmail.com',           mobile: '+919902841114' },
  'Govindaraj Nagar':   { email: 'eogrnbbmpwest9@gmail.com',        mobile: '+919538202886' },
  'Mahalakshmi Layout': { email: 'aeeswm.mahalakshmilayout1@gmail.com', mobile: '+919902841114' },
  'Malleshwaram':       { email: 'aeeswm.malleshwaram@gmail.com',   mobile: '+919731482912' },
  'Rajajinagar':        { email: 'aeeswm.rajajinagar1@gmail.com',   mobile: '+919449788301' },
};

// ─────────────────────────────────────────────────────────────
// WARD → DIVISION MAPPING (pilot wards)
// ─────────────────────────────────────────────────────────────

export const WARD_TO_DIVISION: Record<string, string> = {
  'HSR Layout Ward':    'Bommanahalli',
  'Koramangala Ward':   'Bengaluru South',
  'Indiranagar Ward':   'C.V. Raman Nagar',
  'Whitefield Ward':    'Mahadevapura',
  'Jayanagar Ward':     'Jayanagar',
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
// SMART ROUTING — pick best channels for this report
// ─────────────────────────────────────────────────────────────

export function resolveChannels(params: {
  issueType: string;
  wardName: string;
  wardZone: string;
  triageLevel: 1 | 2 | 3;
}): {
  primary: RoutingChannel[];
  escalation: RoutingChannel[];
  division?: RoutingChannel;
} {
  const category = categorizeIssue(params.issueType);
  const division = WARD_TO_DIVISION[params.wardName];
  const divisionContact = division ? DIVISION_SWM[division] : undefined;

  const primary: RoutingChannel[] = [];
  const escalation: RoutingChannel[] = [];

  if (category === 'pothole') {
    primary.push(CITYWIDE.POTHOLE_BOT);
    primary.push(CITYWIDE.GENERAL_EMAIL);
  } else if (category === 'garbage') {
    primary.push(CITYWIDE.GARBAGE_WA);
    if (divisionContact) {
      primary.push({
        id: `division_${division}`,
        type: 'email',
        name: `${division} SWM`,
        description: 'Division-level contact',
        contact: divisionContact.email,
        scope: 'division',
        responseTime: '1-2 day response',
        priority: 2,
      });
    }
    const zoneSE = ZONE_SE[params.wardZone];
    if (zoneSE) primary.push(zoneSE);
  } else {
    primary.push(CITYWIDE.GENERAL_WA);
    primary.push(CITYWIDE.GENERAL_EMAIL);
  }

  if (params.triageLevel === 1) {
    escalation.push(SWM_HEAD.SPECIAL_COMMR);
    escalation.push(SWM_HEAD.JC_SWM);
  }
  if (params.triageLevel <= 2 && category === 'garbage') {
    escalation.push(SWM_HEAD.CHIEF_ENG);
  }

  return {
    primary,
    escalation,
    division: divisionContact ? {
      id: `division_${division}`,
      type: 'email',
      name: `${division} Division SWM`,
      description: 'Ward-specific contact',
      contact: divisionContact.email,
      scope: 'division',
      responseTime: '1-2 day response',
      priority: 2,
    } : undefined,
  };
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
