import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { isInsideBengaluru } from '@/lib/geofence';
import { checkJurisdiction, detectPrivateProperty } from '@/lib/jurisdictionCheck';
import { assignTriage } from '@/lib/triage';
import type { ClassifyResponse, ClusterInfo, LocationDetails } from '@/lib/types';
import { resolveWard } from '@/lib/wards';

// ─── Rate limit ───────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (entry.count >= 5) return true;

  entry.count += 1;
  return false;
}

// ─── Reverse geocoding ────────────────────────────────────────────────────────

async function getLocationDetails(lat: number, lng: number): Promise<LocationDetails> {
  const fallback: LocationDetails = {
    locality: 'Bengaluru',
    road: null,
    pincode: null,
    city: 'Bengaluru',
    formatted: 'Bengaluru',
  };

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return fallback;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`;
    const res = await fetch(url);

    type GeoResult = {
      status: string;
      results?: { address_components: { types: string[]; long_name: string }[] }[];
    };

    const data = await res.json() as GeoResult;

    if (data.status !== 'OK' || !data.results?.length) return fallback;

    const allComponents = data.results?.flatMap(
      (r) => r.address_components ?? [],
    ) ?? [];

    const road = allComponents.find(
      (c) => c.types?.includes('route'),
    )?.long_name ?? null;

    const locality = allComponents.find(
      (c) =>
        c.types?.includes('sublocality_level_1') ||
        c.types?.includes('sublocality') ||
        c.types?.includes('neighborhood'),
    )?.long_name ?? null;

    const pincode = allComponents.find(
      (c) => c.types?.includes('postal_code'),
    )?.long_name ?? null;

    const cityComp = allComponents.find((c) =>
      c.types?.includes('locality'),
    )?.long_name;

    const city = cityComp ?? 'Bengaluru';

    const resolvedLocality = locality ?? cityComp ?? 'Bengaluru';

    return {
      locality: resolvedLocality,
      road,
      pincode,
      city,
      formatted: `${resolvedLocality}, Bengaluru`,
    };
  } catch {
    return fallback; // silent fallback — never block the main flow
  }
}

// Valid rejection reasons:
// irrelevant_content | indoor_scene | portrait | obscene | non_civic
// screenshot | low_confidence | outside_geofence | parse_error
// ai_generated | reposted_media | no_location_context | implausible_scene

// ─── Claude system prompt ─────────────────────────────────────────────────────

function buildSystemPrompt(localityName: string): string {
  return `You are a civic issue validator for NammuruAI, a platform for reporting public infrastructure problems in ${localityName}, Bengaluru, India. Analyse the image and return ONLY valid JSON — no other text, no markdown.

VALID issues: potholes, road damage, garbage/waste dumping, broken streetlights, open manholes, waterlogging, illegal encroachments, damaged footpaths, broken public property, sewage overflow, fallen trees blocking roads.

INVALID: flowers, decorative plants, indoor spaces, clear sky only, portraits where a face is the primary subject, obscene content, memes, screenshots, food, vehicle interiors, retail interiors, non-Indian context, anything not a genuine outdoor civic issue.

PRIVATE PROPERTY: If the image shows clear signage indicating private property (apartment complex boards, "Private Property" signs, tech park entry gates, military/defence markings, railway property markers), set a new field: "private_property_detected": true and add a note in user_message. This is still valid for classification but flag it for jurisdiction review.

FACES: Incidental background people are fine. Reject only if a human face is the clear primary subject.

Return ONLY this JSON: { "is_valid": boolean, "rejection_reason": "irrelevant_content"|"indoor_scene"|"portrait"|"obscene"|"non_civic"|"screenshot"|"low_confidence"|"ai_generated"|"reposted_media"|"no_location_context"|"implausible_scene"|null, "issue_type": "Pothole"|"Garbage"|"Broken Streetlight"|"Encroachment"|"Waterlogging"|"Other"|null, "severity": "low"|"medium"|"high"|null, "confidence": number 0.0-1.0, "description": string describing the issue in one sentence|null, "user_message": string shown to user, "private_property_detected": boolean }

Rules:
- is_valid false: issue_type/severity/description are null
- confidence < 0.65: is_valid false, rejection_reason: low_confidence
- user_message for rejection: polite, specific, tells user what to fix
- user_message for valid: confirm issue type and severity detected
- private_property_detected: true only if clear private property signage is visible; false otherwise
- When in doubt, reject.`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaudeResult {
  is_valid: boolean;
  rejection_reason: ClassifyResponse['rejection_reason'] | 'parse_error';
  issue_type: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  confidence: number | null;
  description: string | null;
  user_message: string;
  private_property_detected: boolean;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CHECK 1: Input validation
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('image_base64' in body) ||
      !('lat' in body) ||
      !('lng' in body) ||
      typeof (body as Record<string, unknown>).image_base64 !== 'string' ||
      !(body as Record<string, unknown>).image_base64 ||
      typeof (body as Record<string, unknown>).lat !== 'number' ||
      typeof (body as Record<string, unknown>).lng !== 'number'
    ) {
      return NextResponse.json(
        { is_valid: false, user_message: 'Invalid request data.' },
        { status: 400 },
      );
    }

    const { image_base64, lat, lng, manual_location } = body as {
      image_base64: string;
      lat: number;
      lng: number;
      manual_location?: boolean;
    };

    // CHECK 2: Geofence
    if (!isInsideBengaluru(lat, lng)) {
      return NextResponse.json({
        is_valid: false,
        rejection_reason: 'outside_geofence',
        user_message: 'NammuruAI currently covers Bengaluru only.',
        triage_level: null,
        cluster: null,
      } satisfies Partial<ClassifyResponse>);
    }

    // CHECK 2B: Jurisdiction detection (non-blocking — flag only, never rejects)
    const jurisdictionResult = checkJurisdiction(lat, lng);
    const privatePropertyCheck = await detectPrivateProperty(lat, lng);

    const jurisdictionFlag = {
      is_bbmp: jurisdictionResult.is_bbmp,
      authority: jurisdictionResult.authority,
      authority_email: jurisdictionResult.authority_email,
      flag_reason: jurisdictionResult.flag_reason,
      likely_private: privatePropertyCheck.likely_private,
      place_name: privatePropertyCheck.place_name,
      nearest_landmark: privatePropertyCheck.nearest_landmark,
    };

    // CHECK 3: Rate limit
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { is_valid: false, user_message: 'Too many submissions. Please wait a moment.' },
        { status: 429 },
      );
    }

    // Reverse geocode to get location details for context
    const locationDetails = await getLocationDetails(lat, lng);
    const ward = resolveWard(locationDetails.locality);

    // CHECK 4: Claude Vision
    const dataUrlPrefix = image_base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mediaType = (dataUrlPrefix?.[1] ?? 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';
    const base64Data = dataUrlPrefix
      ? image_base64.slice(dataUrlPrefix[0].length)
      : image_base64;

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: buildSystemPrompt(locationDetails.locality),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `MISUSE DETECTION — evaluate ALL of the following before classifying:

CHECK 1 — SCREEN CAPTURE:
Only flag as screenshot if you have HIGH CONFIDENCE based on MULTIPLE
corroborating signals present simultaneously. A single ambiguous signal
is NOT sufficient to reject.

Strong signals (2+ required to reject):
- Screen bezel, monitor frame, or keyboard/desk surface clearly visible
  at the edges of the image
- Moire interference pattern (repeating grid/wave pattern) visible
  across a significant portion of the image
- Clear screen glare or reflection of a room/person on the surface
- UI elements, status bars, app chrome, or watermarks from another device
  clearly overlaid on the image
- Image is visibly photographed at an angle against a flat glowing surface
  with visible curvature or parallax

Weak signals — do NOT reject on these alone:
- Slight compression artifacts (common in WhatsApp/email shared photos)
- Colour flatness (common on overcast days or in shade)
- Slight blur or low resolution (older phones)
- High brightness or washed-out look (direct sunlight)
- Image appears "too clean" or "too dark"

When in doubt, do NOT reject. Let the civic content check decide.
Real photos with minor quality issues are valid submissions.

Only if 2+ strong signals are simultaneously present:
→ is_valid: false, rejection_reason: "screenshot"
→ user_message: "This image appears to be a photo of a screen. Please submit a direct photo of the issue."

CHECK 2 — AI GENERATED IMAGE:
Look for: unnaturally perfect symmetry, painterly texture, inconsistent
shadows or light sources, impossible geometry, watermarks from image
generators, overly clean surfaces with no real-world wear, faces or
figures that look rendered, backgrounds that blur unnaturally.
→ is_valid: false, rejection_reason: "ai_generated"
→ user_message: "This image appears to be AI-generated. Please submit a real photograph."

CHECK 3 — WHATSAPP/REPOSTED IMAGE:
Look for: heavy compression artifacts, watermarks or channel names
overlaid (e.g. WhatsApp, Telegram, news logos), date/time stamps from
another app, caption text burned into the image, aspect ratio typical
of forwarded media (very wide or very narrow), low resolution
inconsistent with a modern phone camera.
→ is_valid: false, rejection_reason: "reposted_media"
→ user_message: "This appears to be a forwarded or reposted image. Please submit a fresh photo you took yourself."

CHECK 4 — NO LOCATION CONTEXT:
Look for: extreme close-up with no surrounding environment visible,
impossible to determine if this is outdoors or indoors, no road
surface, sky, buildings, or landmarks visible anywhere in the frame.
→ is_valid: false, rejection_reason: "no_location_context"
→ user_message: "Please step back and capture the issue with its surroundings visible."

CHECK 5 — INDOOR SCENE:
Look for: ceiling, indoor flooring, walls, furniture, indoor lighting.
Civic issues must be outdoors in a public space.
→ is_valid: false, rejection_reason: "indoor_scene"
→ user_message: "This appears to be an indoor photo. Please photograph the issue from a public outdoor location."

CHECK 6 — PRIVATE PROPERTY SIGNS:
Look for: "Private Property", "No Trespassing", "Private Road",
"Residents Only", compound walls of gated communities, visible
security booths, corporate campus signage.
→ is_valid: true (do not block), set private_property_detected: true
→ user_message: "This may be on private property. Your report will be reviewed before routing."

CHECK 7 — STAGED OR IMPLAUSIBLE SCENE:
Look for: debris or objects arranged unnaturally, civic issue that
appears deliberately placed rather than organically occurring,
inconsistency between the reported issue and the surroundings
(e.g. a single piece of garbage on an otherwise pristine road).
If strongly suspicious:
→ is_valid: false, rejection_reason: "implausible_scene"
→ user_message: "This image does not appear to show a genuine civic issue."

CHECK 8 — NON-CIVIC CONTENT:
Portraits, selfies, animals, food, vehicles without civic context,
commercial signage, political content, obscene content.
→ is_valid: false, rejection_reason: "non_civic"
→ user_message: "Please submit a photo of a civic issue such as a pothole, garbage, or broken infrastructure."

Only proceed to civic classification if ALL checks above pass.

Validate and classify this image reported from ${locationDetails.locality}, Bengaluru (coordinates: ${lat}, ${lng}).\n\nIn your description field, describe ONLY what you physically observe in the image — the condition, severity, and impact. Do NOT mention the locality name or any place name in the description. The location is displayed separately in the UI.\n\nGood example: "Illegal encroachment blocking the footpath with construction waste and debris, creating a public hazard."\n\nBad example: "Illegal encroachment in Mahadevapura blocking the footpath..." ← do not do this\n\nReturn only the JSON.`,
            },
          ],
        },
      ],
    });

    let claudeResult: ClaudeResult;
    try {
      const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('Claude raw response:', rawText.substring(0, 200));

      // Strip markdown code blocks if present
      const cleanText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      claudeResult = JSON.parse(cleanText) as ClaudeResult;
    } catch {
      return NextResponse.json({
        is_valid: false,
        user_message: 'Unable to analyse image. Please try a clearer outdoor photo.',
        rejection_reason: 'parse_error',
        issue_type: null,
        severity: null,
        triage_level: null,
        triage_label: null,
        triage_reason: null,
        description: null,
        confidence: null,
        cluster: null,
        ward_name: ward.ward_name,
        ward_zone: ward.zone,
        ward_is_fallback: ward.is_fallback,
        locality_name: locationDetails.locality,
        location_details: locationDetails,
        nearest_landmark: privatePropertyCheck.nearest_landmark ?? null,
        private_property_detected: false,
        jurisdiction_flag: jurisdictionFlag,
        location_verified: manual_location ? false : true,
        report_hash: null,
      } satisfies ClassifyResponse);
    }

    if (!claudeResult.is_valid) {
      return NextResponse.json({
        is_valid: false,
        user_message: claudeResult.user_message,
        rejection_reason: claudeResult.rejection_reason ?? null,
        issue_type: null,
        severity: null,
        triage_level: null,
        triage_label: null,
        triage_reason: null,
        description: null,
        confidence: claudeResult.confidence,
        cluster: null,
        ward_name: ward.ward_name,
        ward_zone: ward.zone,
        ward_is_fallback: ward.is_fallback,
        locality_name: locationDetails.locality,
        location_details: locationDetails,
        nearest_landmark: privatePropertyCheck.nearest_landmark ?? null,
        private_property_detected: false,
        jurisdiction_flag: jurisdictionFlag,
        location_verified: manual_location ? false : true,
        report_hash: null,
      } satisfies ClassifyResponse);
    }

    // CHECK 5: Cluster detection
    let clusterCount = 0;
    let isCluster = false;
    let clusterId: string | null = null;
    let suggestedAction: string | null = null;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const latDelta = 0.00045;
      const lngDelta = 0.00055;

      const { data: nearbyReports, count } = await supabase
        .from('reports')
        .select('id, issue_type, created_at', { count: 'exact' })
        .gte('lat', lat - latDelta)
        .lte('lat', lat + latDelta)
        .gte('lng', lng - lngDelta)
        .lte('lng', lng + lngDelta)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(50);

      clusterCount = count ?? 0;
      isCluster = clusterCount >= 3;
      clusterId = (nearbyReports?.[0] as { id: string } | undefined)?.id ?? null;

      if (clusterCount >= 10 && claudeResult.issue_type === 'Garbage') {
        suggestedAction =
          'This is not a cleaning issue — it is a capacity issue. Recommend larger bin or revised collection schedule.';
      } else if (clusterCount >= 10 && claudeResult.issue_type === 'Pothole') {
        suggestedAction =
          'Multiple reports indicate road surface failure. Full resurfacing recommended over patching.';
      } else if (clusterCount >= 5) {
        suggestedAction =
          'Recurring reports at this location suggest a systemic issue requiring root cause analysis.';
      } else if (clusterCount >= 3) {
        suggestedAction =
          'Cluster detected — consolidate these reports into a single action item.';
      }
    } catch {
      // Cluster query failure is non-fatal — proceed with defaults
    }

    // CHECK 6: Triage assignment
    const triage = assignTriage(
      claudeResult.issue_type!,
      claudeResult.severity!,
      clusterCount,
    );

    const cluster: ClusterInfo = {
      cluster_count: clusterCount,
      is_cluster: isCluster,
      cluster_id: clusterId,
      suggested_action: suggestedAction,
    };

    const report_hash = createHash('sha256')
      .update(`${image_base64}:${lat}:${lng}`)
      .digest('hex');

    return NextResponse.json({
      is_valid: true,
      user_message: claudeResult.user_message,
      issue_type: claudeResult.issue_type,
      severity: claudeResult.severity,
      triage_level: triage.level,
      triage_label: triage.label,
      triage_reason: triage.reason,
      description: claudeResult.description,
      confidence: claudeResult.confidence,
      rejection_reason: null,
      cluster,
      ward_name: ward.ward_name,
      ward_zone: ward.zone,
      ward_is_fallback: ward.is_fallback,
      locality_name: locationDetails.locality,
      location_details: locationDetails,
      nearest_landmark: privatePropertyCheck.nearest_landmark ?? null,
      private_property_detected: claudeResult.private_property_detected || jurisdictionFlag.likely_private,
      jurisdiction_flag: jurisdictionFlag,
      location_verified: manual_location ? false : true,
      report_hash,
    } satisfies ClassifyResponse);
  } catch (err) {
    console.error('classify route error:', err);
    return NextResponse.json(
      { is_valid: false, user_message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
