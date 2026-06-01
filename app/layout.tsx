import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nammooru.in'),
  title: {
    default: 'Nammooru · Civic accountability for Bengaluru',
    template: '%s · Nammooru',
  },
  description: 'ನಮ್ಮ ಊರು, ನಮ್ಮ ಜವಾಬ್ದಾರಿ — our city, our responsibility. AI-powered civic accountability for Bengaluru: report once, escalate automatically, resolve fully.',
  openGraph: {
    title: 'Nammooru',
    description: 'AI civic accountability platform for Bengaluru. ನಮ್ಮ ಊರು · Our city.',
    url: 'https://nammooru.in',
    siteName: 'Nammooru',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nammooru — civic accountability for Bengaluru',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nammooru',
    description: 'AI civic accountability for Bengaluru.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
