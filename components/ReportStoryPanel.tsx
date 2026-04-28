'use client';

interface ReportStoryPanelProps {
  report: {
    id: string;
    report_id_human: string;
    lat: number;
    lng: number;
    ward_name: string;
    locality_name: string | null;
    issue_type: string;
    severity: string;
    triage_level: number;
    status: string;
    created_at: string;
    description: string | null;
    image_url: string | null;
    forwarded_channels: Array<{ channel: string; at: string }> | null;
    cluster_count: number;
  };
  onClose: () => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  email:                '📧 BBMP Email',
  email_general:        '📧 BBMP Email',
  whatsapp_bbmp:        '💬 BBMP WhatsApp',
  whatsapp_pothole_bot: '🤖 Pothole Bot',
  whatsapp_garbage:     '🗑️ Garbage Hotline',
  whatsapp_rwa:         '🟢 WhatsApp Network',
  tweet:                '𝕏 Twitter',
  copy_link:            '🔗 Link copied',
  print:                '🖨️ Printed',
};

const SLA_HOURS: Record<1 | 2 | 3, number> = { 1: 48, 2: 168, 3: 720 };

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function triagePill(level: number): { color: string; label: string } {
  if (level === 1) return { color: '#e53e3e', label: '⚡ L1 URGENT' };
  if (level === 2) return { color: '#d97706', label: '⏱ L2 MEDIUM' };
  return { color: '#0F6E56', label: '✓ L3 ROUTINE' };
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  color: '#0F6E56',
  fontSize: 10,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  marginBottom: 8,
};

export default function ReportStoryPanel({ report, onClose }: ReportStoryPanelProps) {
  const pill = triagePill(report.triage_level);

  // REACHED: group forwarded channels
  const fwd = report.forwarded_channels ?? [];
  const grouped = fwd.reduce<Record<string, { count: number; latest: string }>>(
    (acc, e) => {
      if (!acc[e.channel]) acc[e.channel] = { count: 0, latest: e.at };
      acc[e.channel].count++;
      if (e.at > acc[e.channel].latest) acc[e.channel].latest = e.at;
      return acc;
    },
    {}
  );
  const groupedEntries = Object.entries(grouped).sort(
    ([, a], [, b]) => (b.latest > a.latest ? 1 : -1)
  );

  // NEXT: SLA countdown
  const sla = SLA_HOURS[(report.triage_level as 1 | 2 | 3)] ?? 720;
  const filed = new Date(report.created_at).getTime();
  const hoursOpen = (Date.now() - filed) / 3600000;
  const hoursLeft = Math.max(0, sla - hoursOpen);
  const deadlinePassed = hoursLeft <= 0;
  const deadlineColor =
    deadlinePassed ? '#e53e3e'
    : hoursLeft > sla * 0.5 ? '#0F6E56'
    : hoursLeft > sla * 0.2 ? '#d97706'
    : '#e53e3e';
  const countdownText = deadlinePassed
    ? 'Deadline passed — RTI ready'
    : hoursLeft >= 24
      ? `${Math.floor(hoursLeft / 24)}d ${Math.floor(hoursLeft % 24)}h left`
      : `${Math.floor(hoursLeft)}h left`;

  // CTAs
  const fullUrl = `/report/${report.report_id_human}`;
  const addVoiceUrl = `/report?nearby=${report.report_id_human}`;
  const rallyMsg = `Civic report from ${report.locality_name ?? report.ward_name}: ${report.issue_type}. View & amplify: ${typeof window !== 'undefined' ? window.location.origin : ''}${fullUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(rallyMsg)}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: 380,
        maxWidth: '92vw',
        background: '#0e1a15',
        borderLeft: '1px solid rgba(15,110,86,0.4)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
        zIndex: 1500,
        overflowY: 'auto',
        animation: 'slideInPanel 280ms ease-out',
        fontFamily: 'DM Sans, sans-serif',
        color: '#f0ede8',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(15,110,86,0.2)',
          position: 'sticky', top: 0, zIndex: 2,
          background: '#0e1a15',
        }}
      >
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: '#0F6E56',
          fontSize: 12,
        }}>
          {report.report_id_human}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none', border: 'none',
            color: '#8a9e96', fontSize: 20, cursor: 'pointer',
            padding: 0, lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Photo */}
      {report.image_url ? (
        <div
          style={{
            width: '100%',
            height: 200,
            backgroundImage: `url('${report.image_url}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            background: `#162118 url('${report.image_url}') center/cover no-repeat`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%', height: 200,
            background: '#162118',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8a9e96', fontSize: 13,
          }}
        >
          No photo
        </div>
      )}

      <div style={{ padding: 16 }}>
        {/* What / Where / Clock */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{
            background: pill.color, color: 'white',
            padding: '3px 10px', borderRadius: 12,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          }}>
            {pill.label}
          </span>
          <span style={{ color: '#f0ede8', fontSize: 14, fontWeight: 500 }}>
            {report.issue_type}
          </span>
        </div>
        <div style={{ color: '#8a9e96', fontSize: 13, marginBottom: 4 }}>
          📍 {report.locality_name ?? report.ward_name}
          {report.locality_name && (
            <span style={{ color: '#5d6f68' }}> · {report.ward_name}</span>
          )}
        </div>
        <div style={{ color: '#8a9e96', fontSize: 12, marginBottom: 18 }}>
          🕒 Filed {relTime(report.created_at)}
        </div>

        {/* THE STORY */}
        <div style={{ marginBottom: 18 }}>
          <div style={SECTION_LABEL}>The Story</div>
          {report.description && (
            <p style={{
              color: '#f0ede8', fontSize: 13, lineHeight: 1.55, margin: '0 0 8px',
            }}>
              {report.description}
            </p>
          )}
          {report.cluster_count >= 3 ? (
            <div style={{
              background: 'rgba(217,119,6,0.12)',
              border: '1px solid rgba(217,119,6,0.4)',
              borderRadius: 8,
              padding: '8px 10px',
              color: '#f0ede8',
              fontSize: 12,
            }}>
              <strong style={{ color: '#d97706' }}>{report.cluster_count} reports</strong>{' '}
              within 50m in the last 7 days — likely a recurring failure point.
            </div>
          ) : (
            <div style={{ color: '#8a9e96', fontSize: 12 }}>
              First-time report at this location.
            </div>
          )}
        </div>

        {/* REACHED */}
        <div style={{ marginBottom: 18 }}>
          <div style={SECTION_LABEL}>Reached</div>
          {groupedEntries.length === 0 ? (
            <div style={{ color: '#8a9e96', fontSize: 12 }}>
              Not yet forwarded to any channel.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groupedEntries.map(([channel, info]) => {
                const label = CHANNEL_LABELS[channel] ?? channel;
                const countSuffix = info.count > 1
                  ? ` · ${info.count} share${info.count === 1 ? '' : 's'}`
                  : '';
                return (
                  <div key={channel} style={{
                    background: '#162118',
                    borderRadius: 8,
                    padding: '7px 10px',
                    fontSize: 12,
                    color: '#f0ede8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span>{label}{countSuffix}</span>
                    <span style={{ color: '#8a9e96', fontSize: 11 }}>
                      {info.count > 1 ? 'most recent ' : ''}{relTime(info.latest)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NEXT */}
        <div style={{ marginBottom: 20 }}>
          <div style={SECTION_LABEL}>Next</div>
          <div style={{
            background: '#162118',
            borderLeft: `3px solid ${deadlineColor}`,
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{
              color: deadlineColor,
              fontFamily: 'Playfair Display, serif',
              fontSize: 18, fontWeight: 700, lineHeight: 1.1, marginBottom: 4,
            }}>
              {countdownText}
            </div>
            <div style={{ color: '#8a9e96', fontSize: 11 }}>
              {deadlinePassed
                ? 'BBMP missed the SLA. An RTI request can now be filed.'
                : `BBMP SLA: ${sla}h for L${report.triage_level} reports.`}
            </div>
            {deadlinePassed && (
              <div style={{
                marginTop: 8,
                display: 'inline-block',
                background: 'rgba(229,62,62,0.15)',
                border: '1px solid rgba(229,62,62,0.4)',
                color: '#e53e3e',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                letterSpacing: '0.1em',
              }}>
                RTI READY
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={fullUrl}
            style={{
              background: '#0F6E56', color: 'white',
              borderRadius: 22, padding: '10px 14px',
              textAlign: 'center', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View Full Report →
          </a>
          <a
            href={addVoiceUrl}
            style={{
              background: '#162118',
              color: '#f0ede8',
              border: '1px solid rgba(15,110,86,0.4)',
              borderRadius: 22, padding: '10px 14px',
              textAlign: 'center', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ➕ Add Your Voice
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#162118',
              color: '#25D366',
              border: '1px solid rgba(37,211,102,0.4)',
              borderRadius: 22, padding: '10px 14px',
              textAlign: 'center', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            💬 WhatsApp Share
          </a>
        </div>
      </div>
    </div>
  );
}
