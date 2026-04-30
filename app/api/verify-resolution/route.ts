import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { computePHash, pHashDistance, PHASH_THRESHOLDS } from '@/lib/phash';
import type { VerifyResolutionRequest, VerifyResolutionResponse } from '@/lib/types';

const ISSUE_RESOLUTION_CHECKS: Record<string, string> = {
  Pothole:      'Is the road surface intact and free of visible potholes or craters? Look for smooth tarmac.',
  Road:         'Is the road surface intact and free of damage?',
  Garbage:      'Is the area clear of accumulated garbage, waste piles, or debris?',
  Streetlight:  'This is a daytime photo — is the light fixture visually intact with no obvious damage?',
  Encroachment: 'Has the previously reported obstruction or encroachment been removed? Is the path/road clear?',
  Drainage:     'Is the drain/road free of visible flooding, blockage, or stagnant water?',
  Waterlogging: 'Is the drain/road free of visible flooding, blockage, or stagnant water?',
};

const GPS_THRESHOLD = 0.00135;
const MAX_ATTEMPTS = 3;

interface ClaudeVerifyResult {
  is_resolved?: boolean;
  confidence?: number;
  evidence?: string;
  uncertainty?: string;
}

interface ReportRow {
  id: string;
  lat: number;
  lng: number;
  issue_type: string;
  status: string;
  resolution_attempts: number | null;
  image_url: string | null;
  image_phash: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyResolutionResponse | { error: string }>> {
  try {
    // STEP 1 — Validate input
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).report_id_human !== 'string' ||
      typeof (body as Record<string, unknown>).image_base64 !== 'string' ||
      typeof (body as Record<string, unknown>).lat !== 'number' ||
      typeof (body as Record<string, unknown>).lng !== 'number' ||
      !(body as Record<string, unknown>).report_id_human ||
      !(body as Record<string, unknown>).image_base64
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { report_id_human, image_base64, lat, lng } = body as VerifyResolutionRequest;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // STEP 2 — Fetch original report
    const { data: report } = await supabase
      .from('reports')
      .select('id, lat, lng, issue_type, status, resolution_attempts, image_url, image_phash')
      .eq('report_id_human', report_id_human)
      .single<ReportRow>();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status === 'resolved') {
      return NextResponse.json({
        verified: true,
        confidence: 1.0,
        status: 'resolved',
        ai_evidence: 'Report already marked as resolved.',
        user_message: 'This report has already been marked as resolved.',
        report_id_human,
      } satisfies VerifyResolutionResponse);
    }

    const currentAttempts = report.resolution_attempts ?? 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({
        verified: false,
        confidence: 0,
        status: 'error',
        ai_evidence: '',
        user_message: 'Maximum verification attempts reached for this report. Contact support.',
        report_id_human,
      } satisfies VerifyResolutionResponse);
    }

    // STEP 3 — GPS proximity check
    const latDelta = Math.abs(lat - report.lat);
    const lngDelta = Math.abs(lng - report.lng);

    if (latDelta > GPS_THRESHOLD || lngDelta > GPS_THRESHOLD * 1.4) {
      await supabase.from('reports')
        .update({ resolution_attempts: currentAttempts + 1 })
        .eq('id', report.id);

      return NextResponse.json({
        verified: false,
        confidence: 0,
        status: 'unverified',
        ai_evidence: 'GPS coordinates do not match the original report location.',
        user_message: 'You appear to be too far from the reported location. Move within 150 metres of the original issue and try again.',
        report_id_human,
      } satisfies VerifyResolutionResponse);
    }

    // STEP 4 — pHash anti-gaming check (soft)
    const resolutionHash = await computePHash(image_base64).catch(() => null);

    if (resolutionHash && report.image_phash) {
      const distance = pHashDistance(resolutionHash, report.image_phash);
      if (distance < PHASH_THRESHOLDS.IDENTICAL) {
        await supabase.from('reports')
          .update({ resolution_attempts: currentAttempts + 1 })
          .eq('id', report.id);

        return NextResponse.json({
          verified: false,
          confidence: 0,
          status: 'unverified',
          ai_evidence: 'Submitted photo appears identical to the original report image.',
          user_message: 'This looks like the same photo as the original report. Please take a fresh photo showing the resolved state.',
          report_id_human,
        } satisfies VerifyResolutionResponse);
      }
    }

    // STEP 5 — Claude Vision verification
    const issueKey = Object.keys(ISSUE_RESOLUTION_CHECKS)
      .find(k => report.issue_type.toLowerCase().includes(k.toLowerCase()))
      ?? 'General';

    const resolutionQuestion = ISSUE_RESOLUTION_CHECKS[issueKey]
      ?? 'Does the area appear free of the reported civic issue?';

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

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          },
          {
            type: 'text',
            text: `This photo was taken to verify that a civic issue has been resolved.
Original issue: ${report.issue_type}

Verification question: ${resolutionQuestion}

Respond ONLY with valid JSON, no markdown:
{
  "is_resolved": true or false,
  "confidence": 0.0 to 1.0,
  "evidence": "one sentence describing what you observe in the image",
  "uncertainty": "brief note if lighting/angle/partial view affects confidence"
}`,
          },
        ],
      }],
    });

    let parsed: ClaudeVerifyResult;
    try {
      const raw = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';
      const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(clean) as ClaudeVerifyResult;
    } catch {
      await supabase.from('reports')
        .update({ resolution_attempts: currentAttempts + 1 })
        .eq('id', report.id);

      return NextResponse.json({
        verified: false,
        confidence: 0,
        status: 'error',
        ai_evidence: '',
        user_message: 'Unable to analyse the photo. Please try again with a clearer image.',
        report_id_human,
      } satisfies VerifyResolutionResponse);
    }

    // STEP 6 — Apply confidence thresholds
    const confidence: number = parsed.confidence ?? 0;
    const isResolved: boolean = parsed.is_resolved ?? false;
    const evidence: string = parsed.evidence ?? '';

    let newStatus: 'resolved' | 'likely_resolved' | 'unverified';
    let userMessage: string;

    if (isResolved && confidence >= 0.80) {
      newStatus = 'resolved';
      userMessage = '✓ Issue verified as resolved. Thank you for confirming the fix!';
    } else if (isResolved && confidence >= 0.60) {
      newStatus = 'likely_resolved';
      userMessage = "The issue appears to be resolved, though we couldn't confirm with full certainty. The report has been marked as likely resolved.";
    } else {
      newStatus = 'unverified';
      userMessage = parsed.uncertainty
        ? `Couldn't verify the fix: ${parsed.uncertainty}. Try again in better light or from a different angle.`
        : 'The issue does not appear to be fully resolved in this photo. Try again once the repair is complete.';
    }

    // STEP 7 — Update Supabase
    const updatePayload: Record<string, unknown> = {
      resolution_attempts: currentAttempts + 1,
      resolution_confidence: confidence,
      resolution_note: evidence,
    };

    if (newStatus === 'resolved' || newStatus === 'likely_resolved') {
      updatePayload.status = newStatus;
      updatePayload.resolved_by = 'community_ai';
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolution_image_url = null;
    }

    await supabase.from('reports')
      .update(updatePayload)
      .eq('id', report.id);

    return NextResponse.json({
      verified: newStatus !== 'unverified',
      confidence,
      status: newStatus,
      ai_evidence: evidence,
      user_message: userMessage,
      report_id_human,
    } satisfies VerifyResolutionResponse);
  } catch (err) {
    console.error('verify-resolution route error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
