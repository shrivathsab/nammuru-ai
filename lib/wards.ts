import type { BengaluruZone, WardData } from './types'

// ─── Tier 1: Pilot wards (full officer details) ───────────────────────────────

export const WARDS: WardData[] = [
  {
    ward_name:     'Whitefield',
    officer_name:  'Rajesh Nataraj',
    officer_email: 'rajesh.nataraj@bbmp.gov.in',
    zone:          'East',
  },
  {
    ward_name:     'HSR Layout',
    officer_name:  'Kavitha Suresh',
    officer_email: 'kavitha.suresh@bbmp.gov.in',
    zone:          'Bommanahalli',
  },
  {
    ward_name:     'Koramangala',
    officer_name:  'Sunil Venkatesh',
    officer_email: 'sunil.venkatesh@bbmp.gov.in',
    zone:          'Bommanahalli',
  },
  {
    ward_name:     'Indiranagar',
    officer_name:  'Meena Prakash',
    officer_email: 'meena.prakash@bbmp.gov.in',
    zone:          'East',
  },
  {
    ward_name:     'Jayanagar',
    officer_name:  'Deepak Murthy',
    officer_email: 'deepak.murthy@bbmp.gov.in',
    zone:          'South',
  },
]

const PILOT_WARD_NAMES = new Set(WARDS.map((w) => w.ward_name))

export function IS_PILOT_WARD(wardName: string): boolean {
  return PILOT_WARD_NAMES.has(wardName)
}

// ─── Tier 2: Zone map (8 BBMP zones) ─────────────────────────────────────────

interface ZoneEntry {
  zone: BengaluruZone
  email: string
  officer: string
  localities: string[]
}

const ZONE_MAP: ZoneEntry[] = [
  {
    zone: 'South',
    email: 'bbmp.south@bbmp.gov.in',
    officer: 'BBMP South Zone Commissioner',
    localities: [
      'jayanagar', 'jp nagar', 'banashankari', 'basavanagudi',
      'padmanabhanagar', 'yelachenahalli', 'uttarahalli', 'kengeri',
      'rajarajeshwari nagar',
    ],
  },
  {
    zone: 'East',
    email: 'bbmp.east@bbmp.gov.in',
    officer: 'BBMP East Zone Commissioner',
    localities: [
      'indiranagar', 'domlur', 'hal', 'vimanapura', 'marathahalli',
      'whitefield', 'kadugodi', 'brookefield', 'hoodi', 'mahadevapura',
    ],
  },
  {
    zone: 'West',
    email: 'bbmp.west@bbmp.gov.in',
    officer: 'BBMP West Zone Commissioner',
    localities: [
      'rajajinagar', 'vijayanagar', 'mahalakshmi layout', 'nandini layout',
      'hesaraghatta', 'jalahalli', 'peenya', 'yeshwanthpur', 'nagarbhavi',
    ],
  },
  {
    zone: 'North',
    email: 'bbmp.north@bbmp.gov.in',
    officer: 'BBMP North Zone Commissioner',
    localities: [
      'hebbal', 'yelahanka', 'jakkur', 'kogilu', 'thanisandra',
      'kalyan nagar', 'rt nagar', 'sanjay nagar', 'sahakara nagar',
    ],
  },
  {
    zone: 'Central',
    email: 'bbmp.central@bbmp.gov.in',
    officer: 'BBMP Central Zone Commissioner',
    localities: [
      'shivajinagar', 'frazer town', 'richmond town', 'langford town',
      'cubbon park', 'mg road', 'brigade road', 'commercial street',
      'gandhinagar',
    ],
  },
  {
    zone: 'Bommanahalli',
    email: 'bbmp.bommanahalli@bbmp.gov.in',
    officer: 'BBMP Bommanahalli Zone Commissioner',
    localities: [
      'hsr layout', 'koramangala', 'btm layout', 'silk board', 'hongasandra',
      'begur', 'electronic city', 'bommanahalli', 'hulimavu',
    ],
  },
  {
    zone: 'Dasarahalli',
    email: 'bbmp.dasarahalli@bbmp.gov.in',
    officer: 'BBMP Dasarahalli Zone Commissioner',
    localities: [
      'dasarahalli', 'jalahalli cross', 'bagalagunte', 'chikkabanavara',
      'doddabidrakallu', 'nagasandra',
    ],
  },
  {
    zone: 'RR Nagar',
    email: 'bbmp.rrnagar@bbmp.gov.in',
    officer: 'BBMP RR Nagar Zone Commissioner',
    localities: [
      'rr nagar', 'rajarajeshwari nagar', 'mysuru road',
      'kengeri satellite town', 'mail', 'talaghattapura',
    ],
  },
]

// ─── Micro-locality → ward map ────────────────────────────────────────────────
// Keys are lowercase Google-returned locality strings; values are ward names.

export const LOCALITY_MAP: Record<string, string> = {
  // HSR Layout area
  'sector 4': 'HSR Layout',
  'sector 1': 'HSR Layout',
  'sector 2': 'HSR Layout',
  'sector 3': 'HSR Layout',
  'sector 5': 'HSR Layout',
  'sector 6': 'HSR Layout',
  'sector 7': 'HSR Layout',

  // Koramangala area
  'koramangala': 'Koramangala',
  'aicobo nagar': 'Koramangala',
  'solar layout': 'Koramangala',
  '4th block': 'Koramangala',

  // Indiranagar / Defence area
  'binnamangala': 'Indiranagar',
  'indira nagar ii stage': 'Indiranagar',
  'defence colony': 'Indiranagar',
  'sodepur': 'Indiranagar',

  // Whitefield area
  'dodsworth layout': 'Whitefield',
  'mahadevapura': 'Whitefield',
  'hoodi': 'Whitefield',
  'devasandra': 'Whitefield',
  'byrappa layout': 'Whitefield',

  // Jayanagar area
  '4th t block east': 'Jayanagar',
  'jayanagar': 'Jayanagar',
  'ittamadu': 'Jayanagar',
  'banashankari': 'Jayanagar',

  // Central / MG Road area
  'fm cariappa colony': 'Shivajinagar',
  'shivajinagar': 'Shivajinagar',

  // Hebbal / North area
  'cholanayakanahalli': 'Hebbal',
  'hebbal': 'Hebbal',
  'amarjyothi colony': 'Hebbal',
  'allalasandra': 'Yelahanka',
  'jakkur': 'Yelahanka',
  'gandhi nagar': 'Yelahanka',

  // South / Electronic City
  'bettadasanapura': 'Begur',
  'begur': 'Begur',
  'electronic city phase i': 'Electronic City',
  'electronic city phase ii': 'Electronic City',

  // West area
  'rajajinagar': 'Rajajinagar',
  'kengeri': 'Kengeri',

  // East area
  'aswath nagar': 'Marathahalli',
  'marathahalli village': 'Marathahalli',
  'laxmi sagar layout': 'KR Puram',
  'ms ramaiah north city': 'Hebbal',
  'silk board': 'Silk Board',

  // BTM Layout
  'btm layout': 'BTM Layout',
  'btm 2nd stage': 'BTM Layout',
}

// ─── Resolution ───────────────────────────────────────────────────────────────

const FALLBACK_WARD: WardData & { is_fallback: boolean } = {
  ward_name:     'Bengaluru Ward',
  officer_name:  'BBMP Grievance Cell',
  officer_email: 'grievance@bbmp.gov.in',
  zone:          'Central',
  is_fallback:   true,
}

export function resolveWard(localityName: string): WardData & { is_fallback: boolean } {
  console.log('DEBUG resolveWard input:', localityName)
  const lower = localityName?.toLowerCase().trim() ?? ''

  // Tier 1: exact pilot ward match
  const pilotMatch = WARDS.find((w) => lower.includes(w.ward_name.toLowerCase()))
  if (pilotMatch) return { ...pilotMatch, is_fallback: false }

  // Tier 1.5a: exact key lookup in locality map
  if (lower in LOCALITY_MAP) {
    const wardName = LOCALITY_MAP[lower]
    const wardMatch = WARDS.find((w) => w.ward_name === wardName)
    return wardMatch
      ? { ...wardMatch, is_fallback: false }
      : { ...FALLBACK_WARD, ward_name: `${wardName} Ward`, is_fallback: false }
  }

  // Tier 1.5b: check if any map key is contained in the input
  const matchedKey = Object.keys(LOCALITY_MAP).find((key) => lower.includes(key))
  if (matchedKey) {
    const wardName = LOCALITY_MAP[matchedKey]
    const wardMatch = WARDS.find((w) => w.ward_name === wardName)
    return wardMatch
      ? { ...wardMatch, is_fallback: false }
      : { ...FALLBACK_WARD, ward_name: `${wardName} Ward`, is_fallback: false }
  }

  // Tier 2: zone map — find zone whose localities list contains a substring of name
  for (const entry of ZONE_MAP) {
    const hit = entry.localities.some((loc) => lower.includes(loc))
    if (hit) {
      return {
        ward_name:     `${entry.zone} Zone`,
        officer_name:  entry.officer,
        officer_email: entry.email,
        zone:          entry.zone,
        is_fallback:   false,
      }
    }
  }

  // Tier 3: hard fallback
  return FALLBACK_WARD
}

// ─── Legacy helpers ───────────────────────────────────────────────────────────

export default WARDS

export function getWard(wardName: string): WardData | undefined {
  return WARDS.find((w) => w.ward_name === wardName)
}
