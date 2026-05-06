import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import {
  submitHourlyLimiter,
  submitDailyLimiter,
  getClientIp,
} from '@/lib/ratelimit'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmitRequest {
  lat: number
  lng: number
  ward_name: string
  issue_type: string
  severity: string
  description: string
  report_hash: string
  triage_level: number
  cluster_count: number
  locality_name: string | null
  pincode: string | null
  nearest_landmark: string | null
  manual_location: boolean
  email_draft: string | null
  email_subject: string | null
  email_recipient: string | null
  report_id_human?: string | null
  tweet_primary?: string | null
  tweet_reply_evidence?: string | null
  tweet_reply_escalation?: string | null
  officer_token?: string | null
  citizen_email?: string | null
}

interface SubmitResponse {
  success: boolean;
  report_id?: string;
  error?: string;
  duplicate?: boolean;
  duplicate_type?: 'identical' | 'similar';
  existing_report_id?: string;
  message?: string;
}

interface ReportInsert {
  lat: number
  lng: number
  ward_name: string
  issue_type: string
  severity: string
  description: string
  image_url: string | null
  report_hash: string
  report_id_human: string
  status: 'open'
  email_draft: string | null
  email_subject: string | null
  email_recipient: string | null
  triage_level: number
  cluster_count: number
  location: string
  locality_name: string | null
  pincode: string | null
  nearest_landmark: string | null
  manual_location: boolean
  tweet_primary: string | null
  tweet_reply_evidence: string | null
  tweet_reply_escalation: string | null
  officer_token: string | null
  citizen_email: string | null
  image_phash: string | null
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isSubmitRequest(value: unknown): value is SubmitRequest {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.lat === 'number' &&
    typeof v.lng === 'number' &&
    typeof v.ward_name === 'string' &&
    typeof v.issue_type === 'string' &&
    typeof v.severity === 'string' &&
    typeof v.description === 'string' &&
    typeof v.report_hash === 'string' &&
    typeof v.triage_level === 'number' &&
    typeof v.cluster_count === 'number' &&
    (v.locality_name === null || typeof v.locality_name === 'string') &&
    (v.pincode === null || typeof v.pincode === 'string') &&
    (v.nearest_landmark === null || typeof v.nearest_landmark === 'string') &&
    typeof v.manual_location === 'boolean' &&
    (v.email_draft === null || typeof v.email_draft === 'string') &&
    (v.email_subject === null || typeof v.email_subject === 'string') &&
    (v.email_recipient === null || typeof v.email_recipient === 'string')
  )
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<SubmitResponse>> {
  try {
    const rawBody: unknown = await request.json().catch(() => null)

    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { success: false, report_id: '', error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const raw = rawBody as Record<string, unknown>
    const { lat, lng, issue_type, report_hash, ward_name, status, officer_token, citizen_email, image_phash } = raw

    const required: Record<string, unknown> = {
      lat, lng, issue_type, report_hash, ward_name
    }
    const missing = Object.entries(required)
      .filter(([, v]) => v == null || v === '')
      .map(([k]) => k)

    if (missing.length > 0) {
      console.error('[Submit] Missing fields:', missing)
      return NextResponse.json(
        { success: false, report_id: '',
          error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const safeStatus = (status as string | undefined) ?? 'open'

    const latNum = Number(lat)
    const lngNum = Number(lng)

    if (!isSubmitRequest({ ...raw, lat: latNum, lng: lngNum })) {
      const fieldTypes = Object.fromEntries(
        Object.entries({ ...raw, lat: latNum, lng: lngNum }).map(([k, v]) => [
          k,
          v === null ? 'null' : typeof v,
        ]),
      )
      console.error('[submit] isSubmitRequest validation failed. Field types:', fieldTypes)
      return NextResponse.json(
        { success: false, report_id: '', error: 'Invalid request body — payload failed type validation. Check server logs for field types.' },
        { status: 400 },
      )
    }

    const body = { ...raw, lat: latNum, lng: lngNum } as SubmitRequest

    if (!body.report_id_human) {
      console.warn('[Submit] WARNING: report_id_human is missing from payload')
    }

    const reportId =
      body.report_id_human ??
      'NMR-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        body.report_hash.slice(0, 4).toUpperCase()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, report_id: reportId, error: 'Supabase not configured' },
        { status: 500 },
      )
    }

    // Per-IP rate limits (Upstash sliding window): hourly burst, then daily abuse
    const ip = getClientIp(request)

    const hourly = await submitHourlyLimiter.limit(ip)
    if (!hourly.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You've submitted several reports recently. " +
            'Please wait a moment before submitting again.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(hourly.limit),
            'X-RateLimit-Remaining': '0',
            'Retry-After': '3600',
          },
        },
      )
    }

    const daily = await submitDailyLimiter.limit(ip)
    if (!daily.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You've reached today's report limit (5 reports/day). " +
            'Your reports are being reviewed. ' +
            'Contact us if you need to report an urgent issue.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(daily.limit),
            'X-RateLimit-Remaining': '0',
            'Retry-After': '86400',
          },
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const image_url =
      typeof raw.image_url === 'string' ? raw.image_url : null

    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .gte('lat', latNum - 0.00045)
      .lte('lat', latNum + 0.00045)
      .gte('lng', lngNum - 0.00055)
      .lte('lng', lngNum + 0.00055)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many reports from this location in the last 24 hours.' },
        { status: 429 },
      )
    }

    const insertPayload: ReportInsert = {
      lat: latNum,
      lng: lngNum,
      ward_name: body.ward_name,
      issue_type: body.issue_type,
      severity: body.severity,
      description: body.description,
      image_url: image_url ?? null,
      report_hash: body.report_hash,
      report_id_human: reportId,
      status: safeStatus as 'open',
      email_draft: body.email_draft,
      email_subject: body.email_subject,
      email_recipient: body.email_recipient,
      triage_level: body.triage_level,
      cluster_count: body.cluster_count,
      // PostGIS geography accepts EWKT; stored as Point(lng lat) in SRID 4326
      location: `SRID=4326;POINT(${lngNum} ${latNum})`,
      locality_name: body.locality_name,
      pincode: body.pincode,
      nearest_landmark: body.nearest_landmark,
      manual_location: body.manual_location,
      tweet_primary: body.tweet_primary ?? null,
      tweet_reply_evidence: body.tweet_reply_evidence ?? null,
      tweet_reply_escalation: body.tweet_reply_escalation ?? null,
      officer_token: typeof officer_token === 'string' ? officer_token : null,
      citizen_email: typeof citizen_email === 'string' ? citizen_email : null,
      image_phash: typeof image_phash === 'string' ? image_phash : null,
    }

      const { error } = await supabase
      .from('reports')
      .insert(insertPayload as never)
      .select('id')
      .single()

    if (error) {
      // Duplicate report_hash — UNIQUE constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, report_id: reportId, error: 'Duplicate report — this issue has already been submitted.' },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { success: false, report_id: reportId, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, report_id: reportId })
  } catch (err) {
    console.error('[submit] Unexpected error:', err)
    return NextResponse.json(
      {
        success: false,
        report_id: '',
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
