'use client';

interface ParticipationLadderProps {
  status: string;
  escalationLevel: number | null;
  emailSentAt: string | null;
  rtiDraft: string | null;
  resolvedAt: string | null;
}

interface Rung {
  key: string;
  label: string;
  sublabel: string;
  rung: string;
  done: boolean;
}

export default function ParticipationLadder({
  status, escalationLevel, emailSentAt, rtiDraft, resolvedAt,
}: ParticipationLadderProps) {
  const level = escalationLevel ?? 0;
  const isResolved = status === 'resolved' || !!resolvedAt;

  const steps: Rung[] = [
    {
      key: 'filed',
      label: 'Filed with BBMP',
      sublabel: 'Formal letter sent to the ward officer',
      rung: 'Informing',
      done: !!emailSentAt,
    },
    {
      key: 'followup',
      label: 'Follow-up sent',
      sublabel: 'No acknowledgement — reminder issued',
      rung: 'Consultation',
      done: level >= 1,
    },
    {
      key: 'escalated',
      label: 'Escalated to commissioner',
      sublabel: 'SLA breached — higher authority notified',
      rung: 'Placation',
      done: level >= 2 || status === 'escalated',
    },
    {
      key: 'rti',
      label: 'Legal notice prepared',
      sublabel: 'RTI drafted — BBMP must respond within 30 days',
      rung: 'Partnership',
      done: !!rtiDraft,
    },
  ];

  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), -1);

  return (
    <div style={{
      background: '#0e1a15',
      borderRadius: 12,
      padding: '18px 16px',
      marginTop: 16,
    }}>
      <div style={{
        color: '#0F6E56',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        Accountability ladder
      </div>
      <p style={{
        color: '#8a9e96',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
        margin: '0 0 16px',
      }}>
        {isResolved
          ? 'Resolved. This report climbed the ladder until the issue was fixed.'
          : 'Most complaint apps stop at the first step. Nammooru keeps climbing until BBMP is compelled to act.'}
      </p>

      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 10, top: 12, bottom: 12,
          width: 2, background: '#1e3028',
        }} />
        <div style={{
          position: 'absolute', left: 10, top: 12,
          width: 2,
          height: lastDone < 0 ? 0 : `calc(${(lastDone / (steps.length - 1)) * 100}% - 0px)`,
          background: '#0F6E56',
          transition: 'height 0.4s ease',
        }} />

        {steps.map((s) => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            position: 'relative', marginBottom: 16,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: s.done ? '#0F6E56' : '#0e1a15',
              border: `2px solid ${s.done ? '#0F6E56' : '#1e3028'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
            }}>
              {s.done && <span style={{ color: 'white', fontSize: 12, lineHeight: 1 }}>✓</span>}
            </div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span style={{
                  color: s.done ? '#f0ede8' : '#5e6f68',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14, fontWeight: 600,
                }}>
                  {s.label}
                </span>
                <span style={{
                  color: '#5e6f68',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: '1px solid #1e3028', borderRadius: 4, padding: '1px 5px',
                }}>
                  {s.rung}
                </span>
              </div>
              <div style={{
                color: '#8a9e96',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12, lineHeight: 1.4, marginTop: 2,
              }}>
                {s.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{
        color: '#5e6f68',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11, lineHeight: 1.5,
        margin: '4px 0 0', fontStyle: 'italic',
      }}>
        Rungs follow Arnstein&apos;s ladder of citizen participation (1969).
      </p>
    </div>
  );
}
