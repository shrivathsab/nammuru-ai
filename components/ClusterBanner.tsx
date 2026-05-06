'use client';

import type { PublicReport } from '@/lib/types';

interface Tier {
  color: string;
  bg: string;
  icon: string;
  label: string;
}

const TIER_1: Tier = {
  color: '#0F6E56',
  bg: 'rgba(15,110,86,0.08)',
  icon: '👥',
  label: 'pattern detected',
};

const TIER_2: Tier = {
  color: '#d4a843',
  bg: 'rgba(212,168,67,0.10)',
  icon: '⚠️',
  label: 'cluster forming',
};

const TIER_3: Tier = {
  color: '#e53e3e',
  bg: 'rgba(229,62,62,0.10)',
  icon: '🚨',
  label: 'civic emergency',
};

function getTier(count: number): Tier {
  if (count >= 8) return TIER_3;
  if (count >= 4) return TIER_2;
  return TIER_1;
}

interface ClusterBannerProps {
  count: number;
  ward: string;
  nearbyReports?: PublicReport[];
  /** ISO timestamp of the oldest unresolved report in the cluster */
  oldestReportAt?: string | null;
  /** Number of escalations sent across the cluster (escalation_level >= 1) */
  escalationCount?: number;
}

export default function ClusterBanner({
  count,
  ward: _ward,
  nearbyReports,
  oldestReportAt,
  escalationCount,
}: ClusterBannerProps) {
  const tier = getTier(count);
  const displayCount = count >= 8 ? '8+' : String(count);

  const daysOld = oldestReportAt
    ? Math.floor(
        (Date.now() - new Date(oldestReportAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const tierIs2 = count >= 4 && count < 8;
  const tierIs3 = count >= 8;

  return (
    <div
      style={{
        background: tier.bg,
        borderLeft: `4px solid ${tier.color}`,
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
      }}
    >
      <div
        style={{
          color: tier.color,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'DM Sans, sans-serif',
          marginBottom: 6,
        }}
      >
        {tier.icon} {displayCount} reports here this week — {tier.label}
      </div>

      {(tierIs2 || tierIs3) && daysOld !== null && (
        <div
          style={{
            color: '#8a9e96',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          Oldest report:{' '}
          {daysOld === 0 ? 'today' : daysOld === 1 ? '1 day ago' : `${daysOld} days ago`}
          {' · Still unresolved'}
        </div>
      )}

      {tierIs3 && escalationCount !== undefined && escalationCount > 0 && (
        <div
          style={{
            color: '#8a9e96',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          {escalationCount} escalation{escalationCount === 1 ? '' : 's'} sent · No BBMP response
        </div>
      )}

      <div
        style={{
          color: '#8a9e96',
          fontSize: 12,
          fontFamily: 'DM Sans, sans-serif',
          marginBottom: nearbyReports?.length || tierIs3 ? 8 : 0,
          lineHeight: 1.5,
        }}
      >
        {tierIs3 ? (
          <>This area is a confirmed civic emergency. BBMP has missed multiple statutory deadlines.</>
        ) : tierIs2 ? (
          <>Cluster forming. BBMP escalation in 48h if no response.</>
        ) : (
          <>Citizens reported similar issues within 100m. BBMP has 48 hours to respond.</>
        )}
      </div>

      {tierIs3 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(212,168,67,0.12)',
            color: '#d4a843',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontFamily: 'DM Sans, sans-serif',
            marginBottom: 8,
          }}
        >
          ⚖️ RTI auto-filing eligible
        </div>
      )}

      {nearbyReports && nearbyReports.length > 0 && (
        <div>
          <a
            href={`/map?lat=${nearbyReports[0].lat}&lng=${nearbyReports[0].lng}`}
            style={{
              color: '#0F6E56',
              fontSize: 12,
              textDecoration: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            View existing reports on map →
          </a>
        </div>
      )}
    </div>
  );
}
