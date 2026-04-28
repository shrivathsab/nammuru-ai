'use client';

interface StatusTimelineProps {
  triageLevel: 1 | 2 | 3;
  filedAt: Date | string;
  hasEmailSubscription: boolean;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';
}

const DEADLINES: Record<number, { response: number; rti: number; escalate: number }> = {
  1: { response: 48, rti: 72, escalate: 168 },
  2: { response: 168, rti: 240, escalate: 336 },
  3: { response: 720, rti: 960, escalate: 1440 },
};

function formatDuration(hours: number): string {
  if (hours < 48) return `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

function formatFiled(filedAt: Date | string): string {
  const d = typeof filedAt === 'string' ? new Date(filedAt) : filedAt;
  if (isNaN(d.getTime())) return 'Now';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DotVariant = 'now' | 'future' | 'resolved' | 'escalated';

function Dot({ variant }: { variant: DotVariant }) {
  const cls =
    variant === 'now'
      ? 'st-dot st-dot-now'
      : variant === 'resolved'
      ? 'st-dot st-dot-resolved'
      : variant === 'escalated'
      ? 'st-dot st-dot-escalated'
      : 'st-dot st-dot-future';
  return <span className={cls} />;
}

export default function StatusTimeline({
  triageLevel,
  filedAt,
  hasEmailSubscription,
  status,
}: StatusTimelineProps) {
  const deadlines = DEADLINES[triageLevel];

  const tailVariant: DotVariant =
    status === 'resolved' ? 'resolved' : status === 'escalated' ? 'escalated' : 'future';

  const rows: { time: string; desc: string; variant: DotVariant }[] = [
    {
      time: formatFiled(filedAt),
      desc: 'Letter sent to Ward Officer',
      variant: 'now',
    },
    {
      time: `+${formatDuration(deadlines.response)}`,
      desc: 'BBMP response expected',
      variant: 'future',
    },
    {
      time: `+${formatDuration(deadlines.rti)}`,
      desc: 'If no response: RTI draft auto-generated',
      variant: 'future',
    },
    {
      time: `+${formatDuration(deadlines.escalate)}`,
      desc: 'Auto-escalation to Zone Commissioner',
      variant: tailVariant,
    },
  ];

  return (
    <div className="st-root">
      <div className="st-line" aria-hidden="true" />
      <ul className="st-list">
        {rows.map((row, i) => (
          <li key={i} className="st-row">
            <Dot variant={row.variant} />
            <div className="st-content">
              <div className="st-time">{row.time}</div>
              <div className="st-desc">{row.desc}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="st-footer">
        {hasEmailSubscription ? (
          <span>📧 We&apos;ll email you when status changes</span>
        ) : (
          <span>
            💡 Add your email to get status updates{' '}
            <a href="/report" className="st-link">
              re-file with email
            </a>
          </span>
        )}
      </div>

      <style>{`
        .st-root {
          position: relative;
          padding: 8px 0 8px 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .st-line {
          position: absolute;
          left: 13px;
          top: 14px;
          bottom: 52px;
          width: 2px;
          background: #0F6E56;
          opacity: 0.55;
        }
        .st-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .st-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
        }
        .st-dot {
          display: inline-block;
          margin-top: 3px;
          flex-shrink: 0;
          border-radius: 50%;
          box-sizing: border-box;
        }
        .st-dot-now {
          width: 12px;
          height: 12px;
          background: #0F6E56;
          box-shadow: 0 0 0 3px rgba(15, 110, 86, 0.25);
          animation: stPulse 2s ease-in-out infinite;
          margin-left: -1px;
        }
        .st-dot-future {
          width: 8px;
          height: 8px;
          border: 2px solid #0F6E56;
          background: transparent;
          margin-left: 1px;
          margin-top: 5px;
        }
        .st-dot-resolved {
          width: 10px;
          height: 10px;
          background: #22c55e;
          border: 2px solid #22c55e;
          margin-top: 4px;
        }
        .st-dot-escalated {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border: 2px solid #ef4444;
          margin-top: 4px;
        }
        @keyframes stPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(15, 110, 86, 0.25); }
          50%      { box-shadow: 0 0 0 6px rgba(15, 110, 86, 0.10); }
        }
        .st-content {
          min-width: 0;
        }
        .st-time {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          color: #9ca79f;
          margin-bottom: 2px;
          letter-spacing: 0.02em;
        }
        .st-desc {
          font-size: 13px;
          color: #f0ede8;
          line-height: 1.45;
        }
        .st-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid rgba(240, 237, 232, 0.08);
          font-size: 12px;
          color: #9ca79f;
        }
        .st-link {
          color: #0F6E56;
          text-decoration: underline;
        }
        .st-link:hover { color: #1a9b78; }
      `}</style>
    </div>
  );
}
