import React from 'react'
import { ImageResponse } from 'next/og'
import { getServerClient } from '@/lib/supabase'

export const runtime = 'edge'

const TEAL = '#0F6E56'
const DARK = '#080f0c'
const MUTED = '#8a9e96'
const RED = '#e53e3e'
const AMBER = '#d97706'

interface OgReport {
  report_id_human: string | null
  issue_type: string
  status: string
  triage_level: number | null
  locality_name: string | null
  ward_name: string
  image_url: string | null
}

function triageColor(level: number): string {
  if (level === 1) return RED
  if (level === 2) return AMBER
  return TEAL
}

function triageLabel(level: number): string {
  if (level === 1) return 'L1 · URGENT'
  if (level === 2) return 'L2 · MEDIUM'
  return 'L3 · ROUTINE'
}

async function fetchReport(reportId: string): Promise<OgReport | null> {
  try {
    const supabase = getServerClient()
    const { data, error } = await supabase
      .from('reports')
      .select('report_id_human, issue_type, status, triage_level, locality_name, ward_name, image_url')
      .eq('report_id_human', reportId)
      .single()
    if (error || !data) return null
    return data as unknown as OgReport
  } catch {
    return null
  }
}

function BrandCard(): React.ReactElement {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: DARK,
      }}
    >
      <div style={{ width: '8px', height: '100%', background: TEAL }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', color: TEAL, fontSize: '72px', fontWeight: 700, fontFamily: 'serif' }}>
          NammuruAI
        </div>
        <div style={{ display: 'flex', color: MUTED, fontSize: '28px', marginTop: '16px' }}>
          ನಮ್ಮ ಊರು · Civic accountability for Bengaluru
        </div>
      </div>
    </div>
  )
}

function ReportCard(report: OgReport): React.ReactElement {
  const triage = report.triage_level ?? 3
  const tColor = triageColor(triage)
  const tLabel = triageLabel(triage)
  const locality = report.locality_name ?? report.ward_name
  const reportId = report.report_id_human ?? ''
  const isResolved = report.status === 'resolved'
  const statusColor = isResolved ? TEAL : AMBER
  const statusLabel = isResolved ? 'RESOLVED' : 'OPEN'

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: DARK,
        position: 'relative',
      }}
    >
      {report.image_url && (
        <img
          src={report.image_url}
          style={{
            position: 'absolute',
            right: 0, top: 0,
            width: '45%', height: '100%',
            objectFit: 'cover',
            opacity: 0.4,
          }}
        />
      )}
      <div style={{ width: '8px', height: '100%', background: TEAL }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', color: TEAL, fontSize: '28px', fontWeight: 700, fontFamily: 'serif' }}>
            NammuruAI
          </div>
          <div style={{ display: 'flex', color: MUTED, fontSize: '16px', marginLeft: 'auto' }}>
            ನಮ್ಮ ಊರು
          </div>
        </div>

        {/* Middle */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex' }}>
            <div
              style={{
                display: 'flex',
                background: tColor,
                color: 'white',
                fontSize: '18px',
                fontWeight: 700,
                borderRadius: '20px',
                padding: '8px 16px',
              }}
            >
              {tLabel}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              color: 'white',
              fontSize: '48px',
              fontWeight: 700,
              fontFamily: 'serif',
              marginTop: '20px',
              lineHeight: 1.1,
            }}
          >
            {report.issue_type}
          </div>

          <div style={{ display: 'flex', color: MUTED, fontSize: '28px', marginTop: '8px' }}>
            {locality}, Bengaluru
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              color: TEAL,
              fontSize: '20px',
              fontFamily: 'monospace',
            }}
          >
            {reportId}
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              background: statusColor,
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              borderRadius: '20px',
              padding: '8px 16px',
            }}
          >
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  )
}

export async function GET(req: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  const report = id ? await fetchReport(id) : null

  const element = report ? ReportCard(report) : BrandCard()

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
  })
}
