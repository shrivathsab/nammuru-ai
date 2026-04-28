'use client';
import { Users, TrendingUp } from 'lucide-react';

interface CommunityRallyProps {
  clusterCount: number;
  locality: string;
  wardName: string;
  whatsappRallyText: string;
  tweetRallyText: string;
}

export default function CommunityRally({
  clusterCount,
  locality,
  wardName,
  whatsappRallyText,
  tweetRallyText,
}: CommunityRallyProps) {
  if (clusterCount <= 1) return null;

  const isHotspot = clusterCount >= 5;

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappRallyText)}`, '_blank');
  };
  const openTweet = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetRallyText)}`, '_blank');
  };

  return (
    <div className="cr-card" data-ward={wardName}>
      <div className="cr-head">
        <div className={`cr-icon ${isHotspot ? 'cr-icon-pulse' : ''}`}>
          {isHotspot ? (
            <TrendingUp size={24} color="#d4a843" />
          ) : (
            <Users size={24} color="#d4a843" />
          )}
        </div>
        <div className="cr-text">
          <div className="cr-title">
            {isHotspot
              ? `Hotspot: ${clusterCount} reports in ${locality}`
              : `${clusterCount} neighbors reported similar issues nearby`}
          </div>
          <div className="cr-body">
            {isHotspot
              ? 'This area is a cluster. Your report strengthens the case for zone-level action. Rally your neighbors.'
              : 'More voices = faster action from BBMP.'}
          </div>
        </div>
      </div>

      <div className="cr-actions">
        <button type="button" className="cr-btn" onClick={openWhatsApp}>
          Share in RWA WhatsApp group →
        </button>
        <button type="button" className="cr-btn" onClick={openTweet}>
          Tweet with neighbors →
        </button>
      </div>

      {isHotspot && (
        <div className="cr-swarm">🔔 You&apos;ll be notified if a community swarm forms</div>
      )}

      <style>{`
        .cr-card {
          background: #0e1a15;
          border-radius: 12px;
          border-left: 4px solid #d4a843;
          padding: 20px;
          color: #f0ede8;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .cr-head {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .cr-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cr-icon-pulse {
          animation: crPulse 2s ease-in-out infinite;
        }
        @keyframes crPulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(1.1); opacity: 0.85; }
        }
        .cr-text { min-width: 0; flex: 1; }
        .cr-title {
          font-size: 15px;
          font-weight: 600;
          color: #f0ede8;
          margin-bottom: 4px;
        }
        .cr-body {
          font-size: 13px;
          color: #9ca79f;
          line-height: 1.5;
        }
        .cr-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .cr-btn {
          background: transparent;
          border: 1px solid #d4a843;
          color: #d4a843;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cr-btn:hover {
          background: #d4a843;
          color: #0e1a15;
        }
        .cr-swarm {
          margin-top: 12px;
          font-size: 12px;
          color: #9ca79f;
        }
      `}</style>
    </div>
  );
}
