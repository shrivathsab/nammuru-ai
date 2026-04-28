'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import MiniMap from '@/components/MiniMap';
import PinDrop from '@/components/PinDrop';
import AmplifyGrid from '@/components/AmplifyGrid';
import RoutingReceipt from '@/components/RoutingReceipt';
import StatusTimeline from '@/components/StatusTimeline';
import CommunityRally from '@/components/CommunityRally';
import { tokens } from '@/lib/design-tokens';
import { reportUrl } from '@/lib/config';

const TEAL = tokens.colors.teal;
const DARK2 = tokens.colors.dark2;
const GOLD = tokens.colors.gold;
const TEXT_PRIMARY = tokens.colors.textPrimary;
const TEXT_MUTED = tokens.colors.textMuted;

type TriageLevel = 1 | 2 | 3;
type ReportStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';

interface NearbyReport {
  id: string;
  lat: number;
  lng: number;
  triage_level: number;
}

interface RawReport {
  report_id_human?: string;
  created_at?: string;
  issue_type?: string;
  locality_name?: string;
  locality?: string;
  ward_name?: string;
  ward_zone?: string;
  lat?: number;
  lng?: number;
  triage_level?: number;
  triage_label?: string;
  cluster_count?: number;
  citizen_email?: string | null;
  status?: string;
  recipient_email?: string;
  subject?: string;
  email_body?: string;
  email_draft?: string;
  cc_emails?: string[];
  tweet_primary?: string;
}

interface AmplifyData {
  reportId: string;
  reportUrl: string;
  filedAt: string;
  issueType: string;
  locality: string;
  wardName: string;
  wardZone: string;
  lat: number;
  lng: number;
  triageLevel: TriageLevel;
  clusterCount: number;
  hasEmailSubscription: boolean;
  status: ReportStatus;
  email: {
    recipient: string;
    subject: string;
    body: string;
    ccList: string[];
  };
  tweetText: string;
  whatsappText: string;
  whatsappRallyText: string;
  tweetRallyText: string;
  nearbyReports: NearbyReport[];
  wardReportCount: number;
}

interface WardStat {
  ward_name: string;
  total_open: number;
}

interface MapDataResponse {
  reports: Array<{
    id: string;
    lat: number;
    lng: number;
    ward_name: string | null;
    triage_level: number | null;
    report_id_human: string | null;
  }>;
  wardStats: WardStat[];
}

function clampTriage(n: number | undefined): TriageLevel {
  if (n === 1 || n === 2 || n === 3) return n;
  return 3;
}

function clampStatus(s: string | undefined): ReportStatus {
  if (s === 'acknowledged' || s === 'in_progress' || s === 'resolved' || s === 'escalated') return s;
  return 'open';
}

function deadlineForWA(level: TriageLevel): string {
  return level === 1 ? '48h' : level === 2 ? '7 days' : '30 days';
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'just now';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function buildAmplifyData(raw: RawReport): AmplifyData | null {
  if (
    raw.report_id_human == null ||
    raw.lat == null ||
    raw.lng == null ||
    raw.issue_type == null ||
    raw.ward_name == null
  ) {
    return null;
  }

  const reportIdHuman = raw.report_id_human;
  const url = reportUrl(reportIdHuman);
  const locality = raw.locality_name ?? raw.locality ?? raw.ward_name;
  const triageLevel = clampTriage(raw.triage_level);
  const triageLabel = raw.triage_label ?? `Level ${triageLevel}`;
  const clusterCount = raw.cluster_count ?? 1;

  const whatsappText = [
    `*Civic Report via NammuruAI*`,
    ``,
    `📍 ${raw.issue_type} at ${locality}`,
    `🚨 Triage: ${triageLabel}`,
    `⏱ BBMP response deadline: ${deadlineForWA(triageLevel)}`,
    ``,
    `View report: ${url}`,
    ``,
    `Share this if you've seen this issue too.`,
  ].join('\n');

  const whatsappRallyText = [
    `*${clusterCount} neighbors reported issues near ${locality}*`,
    ``,
    `This is a pattern, not an accident.`,
    `Add your voice: ${url}`,
  ].join('\n');

  const tweetRallyText =
    `${clusterCount} citizens reported ${raw.issue_type} at ${locality}. Pattern, not accident. @GBA_office must act. ${url}`;

  return {
    reportId: reportIdHuman,
    reportUrl: url,
    filedAt: raw.created_at ?? new Date().toISOString(),
    issueType: raw.issue_type,
    locality,
    wardName: raw.ward_name,
    wardZone: raw.ward_zone ?? '',
    lat: raw.lat,
    lng: raw.lng,
    triageLevel,
    clusterCount,
    hasEmailSubscription: !!raw.citizen_email,
    status: clampStatus(raw.status),
    email: {
      recipient: raw.recipient_email ?? 'grievance@bbmp.gov.in',
      subject: raw.subject ?? `Civic Report ${reportIdHuman}`,
      body: raw.email_body ?? raw.email_draft ?? '',
      ccList: raw.cc_emails ?? [],
    },
    tweetText: raw.tweet_primary ?? '',
    whatsappText,
    whatsappRallyText,
    tweetRallyText,
    nearbyReports: [],
    wardReportCount: 0,
  };
}

interface PageProps {
  params: Promise<{ report_id: string }>;
}

export default function AmplifyPage({ params }: PageProps) {
  const { report_id } = use(params);
  const [data, setData] = useState<AmplifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const cached = sessionStorage.getItem('nammuru_report_draft');
        if (cached) {
          const draft = JSON.parse(cached) as RawReport;
          if (draft.report_id_human === report_id) {
            const built = buildAmplifyData(draft);
            if (built && !cancelled) {
              setData(built);
              setLoading(false);
              return;
            }
          }
        }

        const res = await fetch(`/api/reports/${report_id}`);
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 404
                ? "We couldn't find this report. It may have been deleted or the ID is incorrect."
                : 'Something went wrong loading this report.',
            );
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as RawReport;
        const built = buildAmplifyData(json);
        if (cancelled) return;
        if (!built) {
          setError("We couldn't parse this report's data.");
        } else {
          setData(built);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Network error. Please try again.');
          setLoading(false);
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [report_id]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    fetch('/api/map-data')
      .then((r) => r.json() as Promise<MapDataResponse>)
      .then((md) => {
        if (cancelled) return;
        const wardCount =
          md.wardStats.find((w) => w.ward_name === data.wardName)?.total_open ?? 0;
        const nearby: NearbyReport[] = md.reports
          .filter(
            (r) =>
              r.report_id_human !== data.reportId &&
              Math.abs(r.lat - data.lat) < 0.02 &&
              Math.abs(r.lng - data.lng) < 0.02,
          )
          .slice(0, 30)
          .map((r) => ({
            id: r.id,
            lat: r.lat,
            lng: r.lng,
            triage_level: r.triage_level ?? 3,
          }));
        setData((prev) =>
          prev ? { ...prev, wardReportCount: wardCount, nearbyReports: nearby } : prev,
        );
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [data?.reportId, data?.wardName, data?.lat, data?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <AppShell currentStep={4}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="spinner-teal" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: TEXT_MUTED, fontSize: 14 }}>Preparing your amplify page...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell currentStep={4}>
        <div
          style={{
            maxWidth: 440,
            margin: '64px auto',
            textAlign: 'center',
            background: DARK2,
            border: '1px solid rgba(15,110,86,0.2)',
            borderRadius: 14,
            padding: '40px 32px',
          }}
        >
          <h1 style={{ fontFamily: tokens.fonts.serif, fontSize: 22, marginBottom: 12 }}>
            Report not found
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 24 }}>
            {error ?? "We couldn't find this report."}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: TEAL,
              color: 'white',
              padding: '10px 28px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Back to homepage
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentStep={4}>
      {/* SECTION 1 — THE MOMENT */}
      <section style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', paddingTop: 48 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15,110,86,0.15)',
            border: '1px solid rgba(15,110,86,0.4)',
            color: TEAL,
            padding: '6px 14px',
            borderRadius: 24,
            fontSize: 13,
            fontFamily: tokens.fonts.sans,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          <CheckCircle size={14} />
          Your report is public
        </div>

        <h1
          style={{
            fontFamily: tokens.fonts.serif,
            color: TEXT_PRIMARY,
            fontSize: 32,
            lineHeight: 1.2,
            marginBottom: 8,
            margin: 0,
          }}
        >
          {data.reportId}
        </h1>

        <p
          style={{
            color: TEXT_MUTED,
            fontFamily: tokens.fonts.sans,
            fontSize: 14,
            margin: '8px 0 32px',
          }}
        >
          Filed {formatRelativeTime(data.filedAt)} · {data.issueType} at {data.locality}
        </p>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <MiniMap
            lat={data.lat}
            lng={data.lng}
            wardName={data.wardName}
            nearbyReports={data.nearbyReports}
            animatePin
            zoom={15}
            height="280px"
          />
          <PinDrop lat={data.lat} lng={data.lng} />
        </div>

        {data.wardReportCount > 0 && (
          <p
            style={{
              color: GOLD,
              fontFamily: tokens.fonts.sans,
              fontSize: 14,
              fontStyle: 'italic',
            }}
          >
            Your report joins <strong>{data.wardReportCount}</strong> others in {data.wardName}
          </p>
        )}
      </section>

      {/* SECTION 2 — AMPLIFY GRID */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '48px 0' }}>
        <SectionHeader kicker="AMPLIFY" title="Make Some Noise" subtitle="More channels, more pressure, faster action." />
        <div style={{ marginBottom: 20 }}>
          <RoutingReceipt
            issueType={data.issueType}
            wardName={data.wardName}
            wardZone={data.wardZone}
            triageLevel={data.triageLevel}
          />
        </div>
        <AmplifyGrid
          reportId={data.reportId}
          reportUrl={data.reportUrl}
          issueType={data.issueType}
          wardName={data.wardName}
          wardZone={data.wardZone}
          triageLevel={data.triageLevel}
          locality={data.locality}
          email={data.email}
          tweetText={data.tweetText}
          googleMapsUrl={`https://maps.google.com/?q=${data.lat},${data.lng}`}
          whatsappRallyText={data.whatsappRallyText}
        />
      </section>

      {/* SECTION 3 — STATUS TIMELINE */}
      <section style={{ maxWidth: 520, margin: '0 auto', padding: '0 0 48px' }}>
        <SectionHeader
          kicker="WHAT'S NEXT"
          title="The Accountability Clock"
          subtitle="Every report triggers a deadline BBMP cannot ignore."
        />
        <div
          style={{
            background: DARK2,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <StatusTimeline
            triageLevel={data.triageLevel}
            filedAt={data.filedAt}
            hasEmailSubscription={data.hasEmailSubscription}
            status={data.status}
          />
        </div>
      </section>

      {/* SECTION 4 — COMMUNITY RALLY (conditional) */}
      {data.clusterCount > 1 && (
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 48px' }}>
          <SectionHeader kicker="COMMUNITY" title="You're Not Alone" />
          <CommunityRally
            clusterCount={data.clusterCount}
            locality={data.locality}
            wardName={data.wardName}
            whatsappRallyText={data.whatsappRallyText}
            tweetRallyText={data.tweetRallyText}
          />
        </section>
      )}

      {/* SECTION 5 — WHAT NOW */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 48px' }}>
        <SectionHeader kicker="WHAT NOW" title="Keep Going" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <TileLink href={`/report/${data.reportId}`} label="View public report page →" />
          <TileLink href={`/map?focus=${data.reportId}`} label="See your report on the live map →" />
          <TileLink href="/report" label="File another report →" />
        </div>
      </section>
    </AppShell>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <div
        style={{
          color: GOLD,
          fontSize: 11,
          fontFamily: tokens.fonts.mono,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {kicker}
      </div>
      <h2
        style={{
          fontFamily: tokens.fonts.serif,
          fontSize: 24,
          color: TEXT_PRIMARY,
          margin: 0,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>{subtitle}</p>
      )}
    </div>
  );
}

function TileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        background: DARK2,
        border: `1px solid ${TEAL}`,
        borderRadius: 12,
        padding: 16,
        color: TEXT_PRIMARY,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
      className="btn-teal-glow"
    >
      {label}
    </Link>
  );
}
