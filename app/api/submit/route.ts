import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
  email_draft: string
  email_subject: string
  email_recipient: string
  tweet_primary?: string | null
  tweet_reply_evidence?: string | null
  tweet_reply_escalation?: string | null
}

interface SubmitResponse {
  success: boolean;
  report_id?: string;
  error?: string;
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
  email_draft: string
  email_subject: string
  email_recipient: string
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
    typeof v.email_draft === 'string' &&
    typeof v.email_subject === 'string' &&
    typeof v.email_recipient === 'string'
  )
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<SubmitResponse>> {
  try {
    const body: unknown = await request.json().catch(() => null)

    if (!isSubmitRequest(body)) {
      return NextResponse.json(
        { success: false, report_id: '', error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const reportId =
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .gte('lat', body.lat - 0.00045)
      .lte('lat', body.lat + 0.00045)
      .gte('lng', body.lng - 0.00055)
      .lte('lng', body.lng + 0.00055)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many reports from this location in the last 24 hours.' },
        { status: 429 },
      )
    }

    const insertPayload: ReportInsert = {
      lat: body.lat,
      lng: body.lng,
      ward_name: body.ward_name,
      issue_type: body.issue_type,
      severity: body.severity,
      description: body.description,
      image_url: null,
      report_hash: body.report_hash,
      report_id_human: reportId,
      status: 'open',
      email_draft: body.email_draft,
      email_subject: body.email_subject,
      email_recipient: body.email_recipient,
      triage_level: body.triage_level,
      cluster_count: body.cluster_count,
      // PostGIS geography accepts EWKT; stored as Point(lng lat) in SRID 4326
      location: `SRID=4326;POINT(${body.lng} ${body.lat})`,
      locality_name: body.locality_name,
      pincode: body.pincode,
      nearest_landmark: body.nearest_landmark,
      manual_location: body.manual_location,
      tweet_primary: body.tweet_primary ?? null,
      tweet_reply_evidence: body.tweet_reply_evidence ?? null,
      tweet_reply_escalation: body.tweet_reply_escalation ?? null,
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
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
