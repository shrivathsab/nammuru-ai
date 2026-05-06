'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ReceiptReport {
  report_id_human: string;
  image_url: string | null;
  issue_type: string | null;
  triage_level: number;
  created_at: string;
  email_sent_at: string | null;
  email_sent_auto: boolean | null;
  tweet_id: string | null;
  auto_dispatch: boolean | null;
  ward_name: string | null;
  locality_name: string | null;
}

export default function ReceiptPage() {
  const params = useParams<{ report_id: string }>();
  const [report, setReport] = useState<ReceiptReport | null>(null);
  const [secondsToFile, setSecondsToFile] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = sessionStorage.getItem('file_started_at');
    if (startedAt) {
      const elapsed = (Date.now() - parseInt(startedAt, 10)) / 1000;
      setSecondsToFile(Math.round(elapsed * 10) / 10);
      sessionStorage.removeItem('file_started_at');
    }

    fetch(`/api/reports/${params.report_id}`)
      .then(r => r.json())
      .then(setReport)
      .catch(() => setReport(null));
  }, [params.report_id]);

  if (!report) {
    return (
      <div style={{ background: '#080f0c', minHeight: '100vh', padding: 24 }}>
        <Spinner />
      </div>
    );
  }

  const SLA: Record<number, number> = { 1: 48, 2: 168, 3: 720 };
  const slaHours = SLA[report.triage_level] ?? 720;
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nammooru.in';
  const displayHost = BASE_URL.replace(/^https?:\/\//, '');

  const timeline = [
    {
      done: !!report.email_sent_at,
      icon: '📨',
      title: report.email_sent_at ? 'Email sent to BBMP' : 'Email pending',
      subtitle: report.email_sent_at
        ? formatTime(report.email_sent_at)
        : (report.auto_dispatch ? 'Sending now…' : 'Manual send'),
    },
    {
      done: !!report.tweet_id,
      icon: '🐦',
      title: report.tweet_id ? 'Tweeted from @NammuruAI' : 'Tweet pending',
      subtitle: report.tweet_id
        ? `View: twitter.com/NammuruAI/status/${report.tweet_id}`
        : (report.auto_dispatch ? 'Posting now…' : 'Skipped'),
    },
    {
      done: true,
      icon: '🔗',
      title: 'Public record created',
      subtitle: `${displayHost}/report/${report.report_id_human}`,
    },
    {
      done: false,
      icon: '⏳',
      title: `BBMP must respond in ${slaHours} hours`,
      subtitle: 'We\'ll email you when they do — or escalate if they don\'t',
    },
    {
      done: false,
      icon: '📜',
      title: 'RTI auto-drafted if no reply',
      subtitle: '7 days after filing',
    },
  ];

  const shareWhatsApp = () => {
    const text = `I just filed a civic report with Nammooru: ${report.issue_type ?? 'civic issue'} (${report.report_id_human}). Track it: ${BASE_URL}/report/${report.report_id_human}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <main style={{
      background: '#080f0c', minHeight: '100vh',
      padding: '32px 16px',
    }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>✓</div>
          {secondsToFile !== null && (
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              color: '#f0ede8', fontSize: 28,
              marginBottom: 8,
            }}>
              Filed in {secondsToFile} seconds
            </h1>
          )}
          <div style={{
            color: '#0F6E56', fontFamily: 'JetBrains Mono', fontSize: 12,
          }}>
            {report.report_id_human}
          </div>
        </div>

        {report.image_url && (
          <div style={{
            width: 100, height: 100, borderRadius: 12,
            overflow: 'hidden', margin: '0 auto 24px',
          }}>
            <img src={report.image_url} alt="Reported issue"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{
          color: '#0F6E56', fontFamily: 'JetBrains Mono', fontSize: 11,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          THE RECORD
        </div>
        <div style={{
          background: '#0e1a15', borderRadius: 12, padding: 20,
          marginBottom: 24,
        }}>
          {timeline.map((row, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '12px 0',
              borderBottom: i < timeline.length - 1
                ? '1px solid rgba(15,110,86,0.15)'
                : 'none',
            }}>
              <div style={{
                width: 24, fontSize: 16,
                opacity: row.done ? 1 : 0.5,
              }}>
                {row.done ? '✓' : '○'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: row.done ? '#f0ede8' : '#8a9e96',
                  fontSize: 14, fontFamily: 'DM Sans', fontWeight: 500,
                }}>
                  {row.icon} {row.title}
                </div>
                <div style={{
                  color: '#8a9e96', fontSize: 12,
                  fontFamily: 'DM Sans', marginTop: 2,
                }}>
                  {row.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href={`/report/${report.report_id_human}`} style={primaryBtnStyle}>
            📋 View Public Report
          </Link>
          <button onClick={shareWhatsApp} style={secondaryBtnStyle}>
            💬 Share on WhatsApp
          </button>
        </div>

        <Link href="/file" style={{
          display: 'block',
          textAlign: 'center', marginTop: 32,
          color: '#8a9e96', fontSize: 13, fontFamily: 'DM Sans',
          textDecoration: 'none',
        }}>
          File another report ↗
        </Link>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 32, height: 32, margin: '40vh auto 0',
        borderRadius: '50%',
        border: '3px solid rgba(15,110,86,0.2)',
        borderTopColor: '#0F6E56',
        animation: 'spin 0.8s linear infinite',
      }} />
    </>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const primaryBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 52,
  background: '#0F6E56',
  color: '#ffffff',
  border: 'none',
  borderRadius: 9999,
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
  fontSize: 15,
  textDecoration: 'none',
  cursor: 'pointer',
};

const secondaryBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 52,
  background: 'transparent',
  color: '#0F6E56',
  border: '1px solid #0F6E56',
  borderRadius: 9999,
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
};
