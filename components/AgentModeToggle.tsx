'use client';

interface AgentModeToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function AgentModeToggle({ value, onChange }: AgentModeToggleProps) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        background: '#0e1a15',
        borderLeft: `4px solid ${value ? '#0F6E56' : '#162118'}`,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          border: `2px solid ${value ? '#0F6E56' : '#8a9e96'}`,
          background: value ? '#0F6E56' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
          transition: 'all 0.15s ease',
        }}>
          {value && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            color: '#f0ede8',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14, fontWeight: 600, marginBottom: 4,
          }}>
            Send automatically on my behalf
          </div>
          <div style={{
            color: '#8a9e96',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12, lineHeight: 1.5,
          }}>
            Nammooru will email BBMP from reports@nammooru.in when
            you submit. BBMP replies go directly to your email.
          </div>
        </div>
      </div>
    </div>
  );
}
