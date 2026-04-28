'use client';
import { useEffect, useState } from 'react';

interface PinDropProps {
  lat: number;
  lng: number;
  onComplete?: () => void;
  delay?: number;
}

export default function PinDrop({
  lat, lng, onComplete, delay = 300
}: PinDropProps) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    const doneTimer = setTimeout(() => onComplete?.(), delay + 2800);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(doneTimer);
    };
  }, [delay, onComplete]);

  if (!started) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span className="pin-wave pin-wave-1" />
      <span className="pin-wave pin-wave-2" />
      <svg className="pin-drop-svg" viewBox="0 0 24 32"
           width="28" height="36">
        <path d="M12 0 C5 0 0 5 0 12 C0 20 12 32 12 32 S24 20 24 12 C24 5 19 0 12 0 Z"
              fill="#0F6E56" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>

      <style>{`
        @keyframes pinDrop {
          0%   { transform: translateY(-300px) scale(0.7); opacity: 0; }
          60%  { transform: translateY(0) scale(1);       opacity: 1; }
          75%  { transform: translateY(-20px) scale(1);   opacity: 1; }
          90%  { transform: translateY(0) scale(1);       opacity: 1; }
          100% { transform: translateY(0) scale(1);       opacity: 1; }
        }
        @keyframes pinWave {
          0%   { transform: scale(0.3); opacity: 0.7; }
          100% { transform: scale(4);   opacity: 0;   }
        }
        .pin-drop-svg {
          animation: pinDrop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          filter: drop-shadow(0 4px 12px rgba(15,110,86,0.5));
        }
        .pin-wave {
          position: absolute;
          width: 40px; height: 40px;
          border: 2px solid #0F6E56;
          border-radius: 50%;
        }
        .pin-wave-1 {
          animation: pinWave 1.6s ease-out 1.2s forwards;
        }
        .pin-wave-2 {
          animation: pinWave 1.6s ease-out 1.6s forwards;
        }
      `}</style>
    </div>
  );
}
