'use client';

import type { DraftContentResponse } from '@/lib/types';

interface LetterCardProps {
  draft: DraftContentResponse | null;
  expanded: boolean;
  onToggle: () => void;
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(15,110,86,0.2)',
        borderTopColor: '#0F6E56',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'rgba(15,110,86,0.15)',
        color: '#0F6E56',
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontFamily: 'DM Sans',
      }}
    >
      {children}
    </span>
  );
}

export default function LetterCard({ draft, expanded, onToggle }: LetterCardProps) {
  if (!draft) {
    return (
      <div style={{ background: '#0e1a15', borderRadius: 12, padding: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size={14} />
          <span style={{ color: '#8a9e96', fontSize: 13, fontFamily: 'DM Sans' }}>
            Drafting your formal letter to BBMP...
          </span>
        </div>
      </div>
    );
  }

  const ccCount = draft.cc_emails?.length ?? 0;

  return (
    <div
      style={{
        background: '#0e1a15',
        borderLeft: '4px solid #0F6E56',
        borderRadius: 12,
        marginTop: 12,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 16,
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div
              style={{
                color: '#0F6E56',
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              📨 The Letter
            </div>
            <div style={{ color: '#f0ede8', fontSize: 14, fontFamily: 'DM Sans' }}>
              Will be sent to {1 + ccCount} BBMP channels
            </div>
            <div style={{ color: '#8a9e96', fontSize: 12, marginTop: 2 }}>
              {draft.recipient_name} + {ccCount} CCs
            </div>
          </div>
          <span style={{ color: '#8a9e96', fontSize: 13 }}>
            {expanded ? 'Hide ▲' : 'Read ▼'}
          </span>
        </div>
      </button>

      <div
        style={{
          maxHeight: expanded ? 1200 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            padding: '0 16px 16px',
            borderTop: '1px solid rgba(15,110,86,0.15)',
            paddingTop: 16,
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              color: '#8a9e96',
              marginBottom: 12,
              lineHeight: 1.6,
            }}
          >
            To: {draft.recipient_email}
            <br />
            CC: {(draft.cc_emails ?? []).join(', ')}
            <br />
            Subject: {draft.subject}
          </div>

          <div
            style={{
              color: '#f0ede8',
              fontSize: 13,
              fontFamily: 'DM Sans',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {draft.body}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <Tag>⚖️ BBMP Act 1976 §58</Tag>
            <Tag>📍 GPS coordinates included</Tag>
            <Tag>🔁 RTI escalation in 7 days</Tag>
          </div>
        </div>
      </div>
    </div>
  );
}
