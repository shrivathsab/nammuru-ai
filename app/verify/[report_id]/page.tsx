'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { resizeImage } from '@/lib/imageResize';
import type { VerifyResolutionResponse } from '@/lib/types';

type Phase = 'loading' | 'prompt' | 'capturing' | 'verifying' | 'result' | 'fetch_error';

interface ReportSummary {
  report_id_human: string;
  created_at: string;
  issue_type: string;
  severity: string;
  status: string;
  ward_name: string;
  locality_name: string;
  triage_level: 1 | 2 | 3;
  image_url?: string | null;
}

const TEAL = '#0F6E56';
const AMBER = '#d97706';
const DARK_BG = '#080f0c';
const DARK2 = '#0e1a15';
const TEXT_PRIMARY = '#f0ede8';
const TEXT_MUTED = '#8a9e96';

const VERIFYING_MESSAGES = [
  'Checking GPS coordinates...',
  'Analysing the photo with Claude...',
  'Comparing with original report...',
];

function triageLabel(level: 1 | 2 | 3): { label: string; color: string } {
  if (level === 1) return { label: '⚡ URGENT L1', color: '#e53e3e' };
  if (level === 2) return { label: '⏱ MEDIUM L2', color: AMBER };
  return { label: '✓ ROUTINE L3', color: TEAL };
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default function VerifyPage() {
  const params = useParams<{ report_id: string }>();
  const reportId = params.report_id;

  const [phase, setPhase] = useState<Phase>('loading');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [fetchError, setFetchError] = useState<string>('');

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string>('');

  const [result, setResult] = useState<VerifyResolutionResponse | null>(null);
  const [attempts, setAttempts] = useState<number>(0);

  const [verifyingIdx, setVerifyingIdx] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch report on mount
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;

    fetch(`/api/reports/${reportId}`)
      .then(async (r) => {
        const data = await r.json() as ReportSummary & { error?: string };
        if (cancelled) return;
        if (!r.ok || data.error) {
          setFetchError('Report not found.');
          setPhase('fetch_error');
          return;
        }
        setReport(data);
        if (data.status === 'resolved') {
          setResult({
            verified: true,
            confidence: 1.0,
            status: 'resolved',
            ai_evidence: 'Report already marked as resolved.',
            user_message: 'This report has already been marked as resolved.',
            report_id_human: data.report_id_human,
          });
          setPhase('result');
        } else {
          setPhase('prompt');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError('Network error.');
        setPhase('fetch_error');
      });

    return () => { cancelled = true; };
  }, [reportId]);

  // Cycle verifying messages every 2s
  useEffect(() => {
    if (phase !== 'verifying') return;
    const id = setInterval(() => {
      setVerifyingIdx((i) => (i + 1) % VERIFYING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [phase]);

  // Acquire GPS when entering capturing phase
  useEffect(() => {
    if (phase !== 'capturing' || coords) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setCoordsError('Geolocation unavailable on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoordsError('Location permission denied. Enable location to verify.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [phase, coords]);

  const handleStartCapture = useCallback(() => {
    setPhase('capturing');
    setPhotoDataUrl(null);
    setCoordsError('');
    setTimeout(() => fileInputRef.current?.click(), 50);
  }, []);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const resized = await resizeImage(dataUrl, 1200, 0.85);
      setPhotoDataUrl(resized);
    } catch {
      setCoordsError('Could not read the photo. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!photoDataUrl || !coords || !reportId) return;
    setPhase('verifying');
    setVerifyingIdx(0);
    try {
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id_human: reportId,
          image_base64: photoDataUrl,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      const data = await res.json() as VerifyResolutionResponse;
      setResult(data);
      setAttempts((a) => a + 1);
      setPhase('result');
    } catch {
      setResult({
        verified: false,
        confidence: 0,
        status: 'error',
        ai_evidence: '',
        user_message: 'Network error. Please try again.',
        report_id_human: reportId,
      });
      setPhase('result');
    }
  }, [photoDataUrl, coords, reportId]);

  const handleRetake = useCallback(() => {
    setPhotoDataUrl(null);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }, []);

  const handleTryAgain = useCallback(() => {
    setPhotoDataUrl(null);
    setResult(null);
    setPhase('prompt');
  }, []);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderHeader = () => {
    if (!report) return null;
    const tri = triageLabel(report.triage_level);
    const days = daysSince(report.created_at);

    return (
      <div style={{
        background: DARK2,
        borderLeft: `4px solid ${TEAL}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(15,110,86,0.15)',
            color: TEAL,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 999,
            marginBottom: 10,
          }}>
            #{report.report_id_human}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              color: TEXT_PRIMARY,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              fontWeight: 600,
            }}>
              {report.issue_type}
            </span>
            <span style={{
              background: `${tri.color}22`,
              color: tri.color,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
            }}>
              {tri.label}
            </span>
          </div>

          <div style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
            Filed {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`} at {report.locality_name}
          </div>
        </div>

        {report.image_url ? (
          <img
            src={report.image_url}
            alt=""
            style={{
              width: 50, height: 50,
              objectFit: 'cover',
              borderRadius: 8,
              flexShrink: 0,
            }}
          />
        ) : null}
      </div>
    );
  };

  const renderPrompt = () => (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: TEXT_PRIMARY, fontSize: 24, marginBottom: 12 }}>
        Has this been fixed?
      </h2>
      <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
        Stand near the original location and take a photo.<br />
        Claude will verify the fix and update the public record.
      </p>
      <button onClick={handleStartCapture} style={{
        background: TEAL, color: 'white',
        padding: '14px 32px', borderRadius: 40,
        fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600,
        border: 'none', cursor: 'pointer', width: '100%',
      }}>
        📷 Take Verification Photo
      </button>
    </div>
  );

  const renderCapturing = () => (
    <div style={{ padding: '24px 0' }}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleCapture}
      />

      {photoDataUrl ? (
        <>
          <img
            src={photoDataUrl}
            alt="Verification capture"
            style={{
              width: '100%',
              borderRadius: 12,
              marginBottom: 16,
              display: 'block',
            }}
          />
          {coordsError ? (
            <div style={{
              color: AMBER, fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {coordsError}
            </div>
          ) : !coords ? (
            <div style={{
              color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              Acquiring GPS…
            </div>
          ) : null}

          <button
            onClick={handleVerify}
            disabled={!coords}
            style={{
              background: coords ? TEAL : '#1a2a23',
              color: 'white',
              padding: '14px 32px', borderRadius: 40,
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600,
              border: 'none',
              cursor: coords ? 'pointer' : 'not-allowed',
              width: '100%',
              marginBottom: 12,
              opacity: coords ? 1 : 0.6,
            }}
          >
            Verify this photo →
          </button>

          <button
            onClick={handleRetake}
            style={{
              background: 'transparent',
              color: TEXT_MUTED,
              padding: '12px 24px',
              borderRadius: 40,
              fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              border: `1px solid ${TEXT_MUTED}44`,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Retake
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 20 }}>
            Opening camera…
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: TEAL, color: 'white',
              padding: '14px 32px', borderRadius: 40,
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            📷 Open Camera
          </button>
        </div>
      )}
    </div>
  );

  const renderVerifying = () => (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{
        width: 56, height: 56,
        border: '4px solid rgba(15,110,86,0.2)',
        borderTop: `4px solid ${TEAL}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 28px',
      }} />
      <div style={{
        color: TEXT_PRIMARY,
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 8,
      }}>
        Claude is checking the fix…
      </div>
      <div style={{
        color: TEXT_MUTED,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
      }}>
        {VERIFYING_MESSAGES[verifyingIdx]}
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    if (result.status === 'resolved') {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 56 }}>✅</div>
          <h2 style={{ color: TEAL, fontFamily: 'Playfair Display, serif', fontSize: 24, margin: '16px 0 8px' }}>
            Issue Verified as Resolved
          </h2>
          <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 8 }}>
            {result.ai_evidence}
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 24 }}>
            Confidence: {Math.round(result.confidence * 100)}%
          </p>
          <Link href={`/report/${reportId}`} style={{
            background: TEAL, color: 'white',
            padding: '12px 24px', borderRadius: 40,
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', display: 'inline-block',
          }}>
            View Updated Report →
          </Link>
        </div>
      );
    }

    if (result.status === 'likely_resolved') {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 56 }}>🟡</div>
          <h2 style={{ color: AMBER, fontFamily: 'Playfair Display, serif', fontSize: 24, margin: '16px 0 8px' }}>
            Likely Resolved
          </h2>
          <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 8 }}>
            {result.ai_evidence}
          </p>
          <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontStyle: 'italic', marginBottom: 8 }}>
            Pending community confirmation.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 24 }}>
            Confidence: {Math.round(result.confidence * 100)}%
          </p>
          <Link href={`/report/${reportId}`} style={{
            background: AMBER, color: 'white',
            padding: '12px 24px', borderRadius: 40,
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', display: 'inline-block',
          }}>
            View Updated Report →
          </Link>
        </div>
      );
    }

    // unverified or error
    const canRetry = attempts < 3 && result.status !== 'error';
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 56 }}>🔍</div>
        <h2 style={{ color: AMBER, fontFamily: 'Playfair Display, serif', fontSize: 22, margin: '16px 0 8px' }}>
          Couldn&apos;t Verify Yet
        </h2>
        <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {result.user_message}
        </p>
        {canRetry ? (
          <button onClick={handleTryAgain} style={{
            background: 'transparent',
            border: `1px solid ${TEAL}`, color: TEAL,
            padding: '12px 24px', borderRadius: 40,
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, cursor: 'pointer',
          }}>
            Try Again
          </button>
        ) : (
          <Link href={`/report/${reportId}`} style={{
            color: TEAL,
            fontFamily: 'DM Sans, sans-serif', fontSize: 14,
            textDecoration: 'underline',
          }}>
            View Report →
          </Link>
        )}
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: DARK_BG,
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {phase === 'loading' ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{
              width: 40, height: 40,
              border: '3px solid rgba(15,110,86,0.2)',
              borderTop: `3px solid ${TEAL}`,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <div style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
              Loading report…
            </div>
          </div>
        ) : phase === 'fetch_error' ? (
          <div style={{
            background: DARK2,
            borderLeft: '4px solid #e53e3e',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={{ color: TEXT_PRIMARY, fontFamily: 'Playfair Display, serif', fontSize: 22, marginBottom: 8 }}>
              Report Not Found
            </h2>
            <p style={{ color: TEXT_MUTED, fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
              {fetchError}
            </p>
          </div>
        ) : (
          <>
            {renderHeader()}
            {phase === 'prompt' && renderPrompt()}
            {phase === 'capturing' && renderCapturing()}
            {phase === 'verifying' && renderVerifying()}
            {phase === 'result' && renderResult()}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@400;600&family=JetBrains+Mono:wght@500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
