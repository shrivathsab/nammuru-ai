'use client';

import { useState } from 'react';
import { Users, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import type { UpvoteResponse } from '@/lib/types';

interface UpvoteButtonProps {
  reportIdHuman: string;
  reportLat: number;
  reportLng: number;
  currentUpvotes: number;
  onSuccess?: (newCount: number, remaining: number) => void;
}

type UpvoteState =
  | 'idle'
  | 'checking'
  | 'confirming'
  | 'submitting'
  | 'success'
  | 'too_far'
  | 'already'
  | 'limit';

const TEAL = '#0F6E56';
const AMBER = '#d97706';
const TEXT_MUTED = '#8a9e96';
const DARK3 = '#162118';

// Privacy-preserving device fingerprint — deterministic, no PII stored.
async function computeDeviceHash(): Promise<string> {
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function UpvoteButton({
  reportIdHuman,
  reportLat,
  reportLng,
  currentUpvotes,
  onSuccess,
}: UpvoteButtonProps) {
  const [state, setState] = useState<UpvoteState>('idle');
  const [count, setCount] = useState(currentUpvotes);
  const [distance, setDistance] = useState<number | null>(null);
  const [monthlyRemaining, setMonthlyRemaining] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function handleUpvote() {
    if (!navigator.geolocation) {
      window.alert('Location is unavailable on this device.');
      return;
    }
    setState('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dLat = Math.abs(latitude - reportLat);
        const dLng = Math.abs(longitude - reportLng);
        const approxMeters = Math.sqrt(
          (dLat * 111_000) ** 2 + (dLng * 111_000) ** 2,
        );
        if (approxMeters > 200) {
          setDistance(Math.round(approxMeters));
          setState('too_far');
          return;
        }
        setCoords({ lat: latitude, lng: longitude });
        setState('confirming');
      },
      () => {
        setState('idle');
        window.alert('Location access is needed to upvote nearby issues.');
      },
      { timeout: 8000, maximumAge: 30_000, enableHighAccuracy: true },
    );
  }

  async function confirmUpvote() {
    if (!coords) return;
    setState('submitting');
    try {
      const deviceHash = await computeDeviceHash();
      const res = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id_human: reportIdHuman,
          lat: coords.lat,
          lng: coords.lng,
          device_hash: deviceHash,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as UpvoteResponse;

      if (data.success) {
        const newCount = data.new_upvote_count ?? count + 1;
        setCount(newCount);
        setMonthlyRemaining(data.monthly_remaining ?? null);
        setState('success');
        onSuccess?.(newCount, data.monthly_remaining ?? 0);
        setTimeout(() => setState('idle'), 3000);
      } else if (data.error_code === 'already_upvoted') {
        setState('already');
      } else if (data.error_code === 'monthly_limit') {
        setState('limit');
      } else if (data.error_code === 'too_far') {
        setState('too_far');
      } else {
        setState('idle');
        window.alert(data.error ?? 'Could not record your upvote.');
      }
    } catch {
      setState('idle');
      window.alert('Network error. Please try again.');
    }
  }

  const baseBtn: React.CSSProperties = {
    width: '100%',
    minHeight: 44,
    borderRadius: 9999,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 16px',
  };

  const monthlyPill =
    monthlyRemaining === null ? null : (
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: TEXT_MUTED, marginTop: 6, textAlign: 'center' }}>
        {monthlyRemaining} of 5 upvotes remaining this month
      </div>
    );

  if (state === 'confirming') {
    return (
      <div>
        <input
          type="text"
          value={note}
          maxLength={20}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a short note (optional)"
          style={{
            width: '100%',
            background: DARK3,
            border: '1px solid rgba(15,110,86,0.3)',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#f0ede8',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            marginBottom: 8,
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={confirmUpvote}
          style={{ ...baseBtn, background: TEAL, color: 'white', border: 'none' }}
        >
          <CheckCircle2 size={16} /> Confirm — I&apos;ve seen this
        </button>
      </div>
    );
  }

  if (state === 'too_far') {
    return (
      <button
        type="button"
        disabled
        style={{ ...baseBtn, background: 'transparent', color: AMBER, border: `1px solid ${AMBER}`, cursor: 'default' }}
      >
        <MapPin size={16} /> Move closer to upvote{distance ? ` (~${distance}m away)` : ''}
      </button>
    );
  }

  if (state === 'already') {
    return (
      <button type="button" disabled style={{ ...baseBtn, background: 'transparent', color: TEXT_MUTED, border: `1px solid ${DARK3}`, cursor: 'default' }}>
        <CheckCircle2 size={16} /> Already upvoted
      </button>
    );
  }

  if (state === 'limit') {
    return (
      <button type="button" disabled style={{ ...baseBtn, background: 'transparent', color: TEXT_MUTED, border: `1px solid ${DARK3}`, cursor: 'default' }}>
        Monthly upvote limit reached
      </button>
    );
  }

  if (state === 'success') {
    return (
      <div>
        <button type="button" disabled style={{ ...baseBtn, background: TEAL, color: 'white', border: 'none', cursor: 'default' }}>
          <CheckCircle2 size={16} /> Voice added · {count} corroborated
        </button>
        {monthlyPill}
      </div>
    );
  }

  const isBusy = state === 'checking' || state === 'submitting';
  return (
    <button
      type="button"
      onClick={handleUpvote}
      disabled={isBusy}
      style={{
        ...baseBtn,
        background: 'transparent',
        color: TEAL,
        border: `1px solid ${TEAL}`,
        opacity: isBusy ? 0.7 : 1,
      }}
    >
      {isBusy ? (
        <>
          <Loader2 size={16} className="upvote-spin" />
          {state === 'checking' ? 'Checking location…' : 'Adding your voice…'}
        </>
      ) : (
        <>
          <Users size={16} /> I&apos;ve seen this too{count > 0 ? ` · ${count}` : ''}
        </>
      )}
      <style>{`@keyframes upvoteSpin { to { transform: rotate(360deg) } } .upvote-spin { animation: upvoteSpin 0.8s linear infinite; }`}</style>
    </button>
  );
}
