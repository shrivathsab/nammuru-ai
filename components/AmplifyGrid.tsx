'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Mail, MessageCircle, Link as LinkIcon, Bot, Printer, Users } from 'lucide-react';
import {
  resolveChannels,
  buildWhatsAppUrl,
  buildMailtoUrl,
  categorizeIssue,
  CITYWIDE,
  type RoutingChannel,
} from '@/lib/routing';

interface AmplifyGridProps {
  reportId: string;
  reportUrl: string;
  issueType: string;
  wardName: string;
  wardZone: string;
  triageLevel: 1 | 2 | 3;
  locality: string;
  email: {
    recipient: string;
    subject: string;
    body: string;
    ccList: string[];
  };
  tweetText: string;
  googleMapsUrl: string;
  whatsappRallyText?: string;
}

type ToastState = { message: string; visible: boolean };

const TRIAGE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Critical (Level 1)',
  2: 'Urgent (Level 2)',
  3: 'Standard (Level 3)',
};

const SLA_BY_TRIAGE: Record<1 | 2 | 3, string> = {
  1: '48-hour SLA',
  2: '7-day SLA',
  3: '30-day SLA',
};

const WA_GREEN = '#25D366';
const TEAL = '#0F6E56';
const TEXT_LIGHT = '#f0ede8';
const TEXT_MUTED = '#8a9e96';

function XIcon({ size = 16, color = TEXT_LIGHT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

async function recordForward(reportId: string, channel: string) {
  await fetch(`/api/reports/${reportId}/forward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  }).catch(() => {
    /* silent — never block share */
  });
}

interface ChannelTileProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  responseTime?: string;
  onClick: () => void;
  accentColor: string;
}

function ChannelTile({
  icon,
  title,
  subtitle,
  responseTime,
  onClick,
  accentColor,
}: ChannelTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: '#0e1a15',
        borderRadius: 12,
        padding: 14,
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        borderLeftWidth: 4,
        borderLeftStyle: 'solid',
        borderLeftColor: accentColor,
        font: 'inherit',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: accentColor, display: 'inline-flex' }}>{icon}</span>
        <span
          style={{
            color: TEXT_LIGHT,
            fontFamily: 'DM Sans',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          color: TEXT_MUTED,
          fontFamily: 'DM Sans',
          fontSize: 12,
          marginBottom: responseTime ? 8 : 0,
        }}
      >
        {subtitle}
      </div>
      {responseTime && (
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(15,110,86,0.15)',
            color: TEAL,
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          }}
        >
          ⏱ {responseTime}
        </span>
      )}
    </button>
  );
}

function pickSpecialist(issueType: string): RoutingChannel | null {
  const cat = categorizeIssue(issueType);
  if (cat === 'pothole') return CITYWIDE.POTHOLE_BOT;
  if (cat === 'garbage') return CITYWIDE.GARBAGE_WA;
  return null;
}

export default function AmplifyGrid({
  reportId,
  reportUrl,
  issueType,
  wardName,
  wardZone,
  triageLevel,
  locality,
  email,
  tweetText,
  googleMapsUrl,
  whatsappRallyText,
}: AmplifyGridProps) {
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2500);
  };

  // resolveChannels still consulted so the routing graph stays consistent
  // with RoutingReceipt above the grid.
  useMemo(
    () => resolveChannels({ issueType, wardName, wardZone, triageLevel }),
    [issueType, wardName, wardZone, triageLevel],
  );

  const specialist = useMemo(() => pickSpecialist(issueType), [issueType]);
  const triageLabel = TRIAGE_LABEL[triageLevel];
  const sla = SLA_BY_TRIAGE[triageLevel];

  const buildWaMessage = (channel: RoutingChannel): string => {
    if (channel.type === 'whatsapp_bot') {
      return `Pothole at ${locality}. Location: ${googleMapsUrl}. Report: ${reportUrl}`;
    }
    return [
      `*Civic Complaint via NammuruAI*`,
      ``,
      `Report ID: ${reportId}`,
      `Issue: ${issueType}`,
      `Location: ${locality}`,
      `Triage: ${triageLabel}`,
      ``,
      `📍 ${googleMapsUrl}`,
      `🔗 ${reportUrl}`,
      ``,
      `Formal letter has been sent to the ward officer.`,
      `Public record on NammuruAI.`,
    ].join('\n');
  };

  const handlePrimaryEmail = () => {
    const formal: RoutingChannel = {
      id: 'primary_bbmp',
      type: 'email',
      name: 'BBMP Ward Officer',
      description: 'Formal letter',
      contact: email.recipient,
      scope: 'citywide',
      responseTime: sla,
      priority: 1,
    };
    window.open(
      buildMailtoUrl(formal, {
        subject: email.subject,
        body: email.body,
        cc: email.ccList,
      }),
      '_blank',
    );
    recordForward(reportId, 'email');
    showToast('✓ Opening email client...');
  };

  const handleWhatsApp = (channel: RoutingChannel, channelId: string) => {
    window.open(buildWhatsAppUrl(channel, buildWaMessage(channel)), '_blank');
    recordForward(reportId, channelId);
    showToast('✓ Opening WhatsApp...');
  };

  const handleRallyWA = () => {
    const text =
      whatsappRallyText ?? `Civic issue at ${locality}. See report: ${reportUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    recordForward(reportId, 'whatsapp_rwa');
    showToast('✓ Opening WhatsApp...');
  };

  const handleTweet = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank',
    );
    recordForward(reportId, 'tweet');
    showToast('✓ Opening Twitter...');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      recordForward(reportId, 'copy_link');
      showToast('✓ Copied!');
    } catch {
      showToast('✗ Copy failed');
    }
  };

  const handlePrint = () => {
    recordForward(reportId, 'print');
    showToast('✓ Opening print dialog...');
    window.print();
  };

  // Specialist channel ID mapping that matches CHANNEL_LABELS in ReportStoryPanel
  const specialistChannelId =
    specialist?.id === 'wa_pothole'
      ? 'whatsapp_pothole_bot'
      : specialist?.id === 'wa_garbage'
        ? 'whatsapp_garbage'
        : null;

  const ccCount = email.ccList.length;
  const primarySubtitle = `Ward Officer${ccCount > 0 ? ` + ${ccCount} CC${ccCount === 1 ? '' : 's'}` : ''} · ${sla}`;

  return (
    <div className="amplify-grid">
      {/* Row 1 — Primary CTA, full width */}
      <button
        type="button"
        className="tile-primary-full"
        onClick={handlePrimaryEmail}
      >
        <div className="tile-icon">
          <Mail size={22} color="#fff" />
        </div>
        <div>
          <div className="tile-title">Send Formal Letter to BBMP</div>
          <div className="tile-sub">{primarySubtitle}</div>
        </div>
      </button>

      {/* Row 2 — WhatsApp specialist + general hotline */}
      {specialist && specialistChannelId && (
        <ChannelTile
          icon={
            specialist.type === 'whatsapp_bot' ? (
              <Bot size={20} />
            ) : (
              <MessageCircle size={20} />
            )
          }
          title={specialist.name}
          subtitle={specialist.description}
          responseTime={specialist.responseTime}
          onClick={() => handleWhatsApp(specialist, specialistChannelId)}
          accentColor={WA_GREEN}
        />
      )}
      <ChannelTile
        icon={<MessageCircle size={20} />}
        title={CITYWIDE.GENERAL_WA.name}
        subtitle="General hotline · +91 9480685700"
        responseTime={CITYWIDE.GENERAL_WA.responseTime}
        onClick={() => handleWhatsApp(CITYWIDE.GENERAL_WA, 'whatsapp_bbmp')}
        accentColor={WA_GREEN}
      />

      {/* Row 3 — WhatsApp Network rally + Tweet */}
      <ChannelTile
        icon={<Users size={20} />}
        title="WhatsApp Network"
        subtitle="Rally your RWA group"
        responseTime="instant"
        onClick={handleRallyWA}
        accentColor={WA_GREEN}
      />
      <ChannelTile
        icon={<XIcon size={16} color={TEXT_LIGHT} />}
        title="Tweet @GBA_office"
        subtitle="Public pressure on X"
        responseTime="instant"
        onClick={handleTweet}
        accentColor={TEXT_LIGHT}
      />

      {/* Row 4 — Copy URL + Print */}
      <ChannelTile
        icon={<LinkIcon size={20} />}
        title="Copy Public URL"
        subtitle="Share this report link"
        responseTime="instant"
        onClick={handleCopy}
        accentColor={TEAL}
      />
      <ChannelTile
        icon={<Printer size={20} />}
        title="Print Letter"
        subtitle="For walk-in or postal delivery"
        onClick={handlePrint}
        accentColor={TEAL}
      />

      {toast.visible && (
        <div className="amplify-toast" role="status">
          {toast.message}
        </div>
      )}

      <style>{`
        .amplify-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 560px) {
          .amplify-grid { grid-template-columns: 1fr; }
        }
        .tile-primary-full {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 18px;
          border-radius: 12px;
          background: ${TEAL};
          border: none;
          color: #fff;
          cursor: pointer;
          font: inherit;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .tile-primary-full:hover {
          background: #1a9b78;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 110, 86, 0.35);
        }
        .tile-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .tile-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.85);
        }
        .amplify-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0e1a15;
          border: 1px solid ${TEAL};
          color: ${TEXT_LIGHT};
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 6px 24px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}
