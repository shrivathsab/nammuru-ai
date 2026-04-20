export interface JurisdictionResult {
  is_bbmp: boolean;
  authority: string;
  authority_email: string | null;
  zone_name: string;
  flag_reason: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface ExclusionZone {
  name: string;
  authority: string;
  authority_email: string;
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number };
}

const EXCLUSION_ZONES: ExclusionZone[] = [
  {
    name: 'Bangalore Cantonment',
    authority: 'Defence Estates Office',
    authority_email: 'deo.bangalore@gov.in',
    bounds: { latMin: 12.978, latMax: 12.998, lngMin: 77.625, lngMax: 77.655 },
  },
  {
    name: 'HAL Township',
    authority: 'Hindustan Aeronautics Limited',
    authority_email: 'estate@hal-india.co.in',
    bounds: { latMin: 12.945, latMax: 12.960, lngMin: 77.665, lngMax: 77.690 },
  },
  {
    name: 'Kempegowda International Airport Zone',
    authority: 'Airports Authority of India',
    authority_email: 'grievance@bialinfra.com',
    bounds: { latMin: 13.180, latMax: 13.230, lngMin: 77.680, lngMax: 77.730 },
  },
  {
    name: 'KIADB Electronics City',
    authority: 'Karnataka Industrial Areas Development Board',
    authority_email: 'helpdesk@kiadb.in',
    bounds: { latMin: 12.840, latMax: 12.870, lngMin: 77.660, lngMax: 77.700 },
  },
  {
    name: 'Whitefield IT Zone (EPIP)',
    authority: 'KIADB / Private Township',
    authority_email: 'helpdesk@kiadb.in',
    bounds: { latMin: 12.975, latMax: 13.010, lngMin: 77.730, lngMax: 77.780 },
  },
];

// Known BBMP areas that may overlap exclusion bounding boxes
const BBMP_OVERRIDES = [
  { latMin: 12.975, latMax: 12.982, lngMin: 77.637, lngMax: 77.648 },
  // Indiranagar 100 Feet Road — confirmed BBMP
];

export function checkJurisdiction(lat: number, lng: number): JurisdictionResult {
  const isBBMPOverride = BBMP_OVERRIDES.some(
    (b) => lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax,
  );

  if (isBBMPOverride) {
    return {
      is_bbmp: true,
      authority: 'BBMP',
      authority_email: null,
      zone_name: 'BBMP Area',
      flag_reason: null,
      confidence: 'high',
    };
  }

  for (const zone of EXCLUSION_ZONES) {
    const { latMin, latMax, lngMin, lngMax } = zone.bounds;
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return {
        is_bbmp: false,
        authority: zone.authority,
        authority_email: zone.authority_email,
        zone_name: zone.name,
        flag_reason:
          `This location appears to be inside ${zone.name}, which is managed by ${zone.authority}, not BBMP.`,
        confidence: 'high',
      };
    }
  }

  return {
    is_bbmp: true,
    authority: 'BBMP',
    authority_email: null,
    zone_name: 'BBMP Area',
    flag_reason: null,
    confidence: 'high',
  };
}

// These place types indicate private/non-BBMP jurisdiction
const PRIVATE_TYPES = [
  'premise',
  'airport',
  'military_base',
  'university',
  'hospital',
  'shopping_mall',
  'stadium',
  'train_station',
  'subway_station',
];

const GATED_KEYWORDS = [
  'apartment', 'residency', 'enclave', 'villa', 'township',
  'layout', 'campus', 'park', 'estate', 'tech park',
  'software park', 'it park', 'brigade', 'prestige',
  'sobha', 'purva', 'godrej', 'embassy',
];

// Useful place types in preference order
const USEFUL_TYPES = [
  // 1. Transit
  'transit_station',
  'subway_station',
  'train_station',
  // 2. Emergency / civic services
  'hospital',
  'police',
  'fire_station',
  // 3. Public institutions
  'park',
  'university',
  'school',
  'museum',
  'library',
  // 4. Worship
  'place_of_worship',
  // 5. Retail anchors
  'shopping_mall',
  'supermarket',
  // 6. Restaurants (last named place)
  'restaurant',
  // 7. Catch-all
  'establishment',
];

const POOR_LANDMARK_KEYWORDS = [
  'building', 'tower', 'block', 'layout', 'colony',
  'stage', 'phase', 'nagar', 'residency', 'apartment',
  'pvt ltd', 'private limited', 'technologies', 'solutions',
  'infotech', 'software', 'construction', 'enterprises',
  'atm', 'kptcl', 'bescom', 'bwssb',
];

const isTooGeneric = (name: string): boolean => {
  const lower = name.toLowerCase();
  if (lower.length < 5) return true;
  return POOR_LANDMARK_KEYWORDS.some((k) => lower === k || lower.endsWith(' ' + k));
};

export async function detectPrivateProperty(
  lat: number,
  lng: number,
): Promise<{ likely_private: boolean; place_name: string | null; place_type: string | null; nearest_landmark: string | null }> {
  const fallback = { likely_private: false, place_name: null, place_type: null, nearest_landmark: null };

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return fallback;

    // Search for establishments within 100 metres (30m was too small for GPS accuracy)
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}&radius=100&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json() as {
      results?: { name?: string; types?: string[] }[];
    };

    if (!data.results?.length) return fallback;

    const results = data.results;

    // ── Private property detection (first result as before) ──────────────────
    const place = results[0];
    const types = place.types ?? [];

    const isPrivateType = types.some((t) => PRIVATE_TYPES.includes(t));
    const name = (place.name ?? '').toLowerCase();
    const isGatedKeyword = GATED_KEYWORDS.some((k) => name.includes(k));

    const likely_private = isPrivateType || isGatedKeyword;
    const place_name = place.name ?? null;
    const place_type = likely_private ? (types[0] ?? 'private_property') : null;

    // ── Landmark detection (scan all results, prefer by type order) ──────────
    let nearest_landmark: string | null = null;

    for (const landmarkType of USEFUL_TYPES) {
      const match = results.find((r) => {
        const rTypes = r.types ?? [];
        const rName = r.name ?? '';
        return rTypes.includes(landmarkType) && rName.length > 0 && !isTooGeneric(rName);
      });
      if (match?.name) {
        nearest_landmark = match.name;
        break;
      }
    }

    return { likely_private, place_name, place_type, nearest_landmark };
  } catch {
    // Never block submission on Places API failure
    return fallback;
  }
}
