'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Phase = 'loading' | 'resolved' | 'likely_resolved' | 'escalated' | 'reopen' | 'error';

export default function ResolvePage() {
  const params       = useParams<{ report_id: string }>();
  const searchParams = useSearchParams();
  const [phase, setPhase]     = useState<Phase>('loading');
  const [message, setMessage] = useState('');

  const reportId = params.report_id;
  const action   = searchParams.get('action') ?? '';
  const token    = searchParams.get('token') ?? '';

  useEffect(() => {
    if (!reportId || !action || !token) {
      setPhase('error');
      setMessage('Missing required parameters.');
      return;
    }

    fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id_human: reportId, action, token }),
    })
      .then(r => r.json())
      .then((data: { success: boolean; status?: string; error?: string }) => {
        if (!data.success) {
          setPhase('error');
          setMessage(data.error ?? 'Something went wrong.');
        } else {
          setPhase((data.status as Phase) ?? 'resolved');
        }
      })
      .catch(() => {
        setPhase('error');
        setMessage('Network error. Please try again.');
      });
  }, [reportId, action, token]);

  const CONFIG: Record<Phase, {
    icon: string; color: string; heading: string; body: string;
  }> = {
    loading: {
      icon: '⏳', color: '#8a9e96',
      heading: 'Processing…',
      body: 'Please wait.',
    },
    resolved: {
      icon: '✅', color: '#0F6E56',
      heading: 'Marked as Resolved',
      body: 'Thank you for confirming. The public record has been updated.',
    },
    likely_resolved: {
      icon: '🟡', color: '#d97706',
      heading: 'Likely Resolved',
      body: 'AI could not confirm with full certainty, but the report has been marked as likely resolved.',
    },
    escalated: {
      icon: '⚠️', color: '#d97706',
      heading: 'Report Escalated',
      body: 'We have noted that this remains unresolved. An RTI draft is available on your report page.',
    },
    reopen: {
      icon: '🔄', color: '#8a9e96',
      heading: 'Report Reopened',
      body: 'This report is back to open status.',
    },
    error: {
      icon: '❌', color: '#e53e3e',
      heading: 'Link Expired or Invalid',
      body: message || 'This link may have expired. View your report directly.',
    },
  };

  const cfg = CONFIG[phase];

  return (
    <div style={{
      minHeight: '100vh', background: '#080f0c',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#0e1a15',
        border: `1px solid ${cfg.color}44`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 16, padding: 32,
        maxWidth: 480, width: '100%',
        textAlign: 'center',
      }}>
        {phase === 'loading' ? (
          <div style={{
            width: 48, height: 48,
            border: '3px solid rgba(15,110,86,0.2)',
            borderTop: '3px solid #0F6E56',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 20px',
          }} />
        ) : (
          <div style={{ fontSize: 52, marginBottom: 16 }}>{cfg.icon}</div>
        )}

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          color: cfg.color, fontSize: 24,
          marginBottom: 12,
        }}>
          {cfg.heading}
        </h1>

        <p style={{
          color: '#8a9e96', fontFamily: 'DM Sans, sans-serif',
          fontSize: 14, lineHeight: 1.6, marginBottom: 24,
        }}>
          {cfg.body}
        </p>

        <Link href={`/report/${reportId}`} style={{
          display: 'inline-block',
          background: '#0F6E56', color: 'white',
          padding: '12px 28px', borderRadius: 40,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14, fontWeight: 600,
          textDecoration: 'none',
        }}>
          View Report →
        </Link>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@400;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
