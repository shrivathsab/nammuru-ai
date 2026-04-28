import { resolveChannels } from '@/lib/routing';

interface RoutingReceiptProps {
  issueType: string;
  wardName: string;
  wardZone: string;
  triageLevel: 1 | 2 | 3;
}

function scopeLabel(scope: string): string {
  return (
    ({
      citywide: 'BBMP citywide',
      zone: 'Zone-level',
      division: 'Division-level',
      specialist: 'Specialist channel',
      public: 'Public record',
    } as Record<string, string>)[scope] ?? scope
  );
}

export default function RoutingReceipt(props: RoutingReceiptProps) {
  const routing = resolveChannels(props);
  const all = [...routing.primary, ...routing.escalation];

  return (
    <div
      style={{
        background: '#0e1a15',
        border: '1px solid rgba(15,110,86,0.3)',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'DM Sans',
      }}
    >
      <div
        style={{
          borderBottom: '1px dashed rgba(15,110,86,0.3)',
          paddingBottom: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: 'JetBrains Mono',
            color: '#8a9e96',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          ROUTING RECEIPT
        </div>
        <div
          style={{
            color: '#f0ede8',
            fontSize: 14,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {all.length} channels will receive this report
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {all.map((ch, i) => (
          <div
            key={ch.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: 8,
              borderBottom:
                i < all.length - 1
                  ? '1px solid rgba(15,110,86,0.1)'
                  : 'none',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: '#f0ede8',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {ch.name}
              </div>
              <div
                style={{
                  color: '#8a9e96',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  marginTop: 2,
                }}
              >
                {ch.contact}
              </div>
              <div
                style={{
                  color: '#8a9e96',
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {scopeLabel(ch.scope)} · {ch.responseTime}
              </div>
            </div>
            <span
              style={{
                background:
                  ch.scope === 'specialist'
                    ? 'rgba(212,168,67,0.15)'
                    : ch.scope === 'zone'
                    ? 'rgba(15,110,86,0.15)'
                    : 'rgba(138,158,150,0.15)',
                color:
                  ch.scope === 'specialist'
                    ? '#d4a843'
                    : ch.scope === 'zone'
                    ? '#0F6E56'
                    : '#8a9e96',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {ch.scope}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px dashed rgba(15,110,86,0.3)',
          color: '#8a9e96',
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        Channels are auto-selected based on issue type and ward.
        You decide which to send via the buttons below.
      </div>
    </div>
  );
}
