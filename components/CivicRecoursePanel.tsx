'use client';
import { CIVIC_RECOURSE, GOVERNANCE_NOTE } from '@/lib/civic-recourse';

export default function CivicRecoursePanel() {
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
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Your civic recourse
      </div>

      <div style={{
        background: '#080f0c',
        borderLeft: '3px solid #d4a843',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 16,
      }}>
        <div style={{
          color: '#f0ede8', fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.4,
        }}>
          {GOVERNANCE_NOTE.headline}
        </div>
        <div style={{
          color: '#8a9e96', fontFamily: 'DM Sans, sans-serif',
          fontSize: 12, lineHeight: 1.5,
        }}>
          {GOVERNANCE_NOTE.body}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CIVIC_RECOURSE.map(c => (
          <div key={c.id} style={{
            border: '1px solid #1e3028', borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', gap: 8, marginBottom: 4,
            }}>
              <span style={{
                color: '#f0ede8', fontFamily: 'DM Sans, sans-serif',
                fontSize: 14, fontWeight: 600,
              }}>
                {c.title}
              </span>
              <span style={{
                color: '#5e6f68', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, flexShrink: 0,
              }}>
                {c.legalBasis}
              </span>
            </div>
            <div style={{
              color: '#6f8279', fontFamily: 'DM Sans, sans-serif',
              fontSize: 11, marginBottom: 4,
            }}>
              {c.when}
            </div>
            <div style={{
              color: '#8a9e96', fontFamily: 'DM Sans, sans-serif',
              fontSize: 12, lineHeight: 1.5, marginBottom: 10,
            }}>
              {c.detail}
            </div>
            <a
              href={c.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#0F6E56', fontFamily: 'DM Sans, sans-serif',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              {c.actionLabel} -&gt;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
