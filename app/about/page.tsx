// Simple about page — required for the footer "About Nammooru" link.
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About · Nammooru' };

const PROJECT_START = new Date('2026-04-29').getTime();
function buildDay(): number {
  return Math.min(14, Math.floor((Date.now() - PROJECT_START) / 86_400_000) + 1);
}

export default function AboutPage() {
  return (
    <main style={{ background: '#080f0c', minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
        <Link
          href="/"
          style={{ color: '#0F6E56', fontFamily: 'DM Sans, sans-serif', fontSize: 13, textDecoration: 'none' }}
        >
          ← Nammooru
        </Link>
        <h1 style={{ color: '#f0ede8', fontFamily: 'Playfair Display, serif', fontSize: 28, margin: '20px 0 16px' }}>
          About Nammooru
        </h1>
        <p style={{ color: '#8a9e96', fontFamily: 'DM Sans, sans-serif', fontSize: 16, lineHeight: 1.7 }}>
          Nammooru is an AI agent for civic accountability in Bengaluru. It helps
          citizens report public issues, drafts formal legal letters citing the
          Greater Bengaluru Governance Act 2024 and BBMP Act 1976, and escalates
          automatically until the authority responds.
        </p>
        <p style={{ color: '#8a9e96', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.7, marginTop: 24 }}>
          Bengaluru&apos;s municipal body (BBMP) was dissolved on 2 September 2025
          and replaced by the Greater Bengaluru Authority and its five city
          corporations. Nammooru routes every report to the correct corporation
          and the verified GBA channels of record.
        </p>
        <p style={{ color: '#8a9e96', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.7, marginTop: 24 }}>
          Built in public · Day {buildDay()} of 14
        </p>
        <p style={{ color: '#5e6f68', fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginTop: 32 }}>
          ನಮ್ಮ ಊರು, ನಮ್ಮ ಜವಾಬ್ದಾರಿ · Not affiliated with BBMP or the GBA.
        </p>
      </div>
    </main>
  );
}
