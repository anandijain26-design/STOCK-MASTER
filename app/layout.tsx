import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/src/components/AppProviders';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stock Mastery — Indian Stock Market Intelligence & Trading Terminal',
  description:
    'Live NSE & BSE market tracking, TradingView technical charting, multi-condition scanners, F&O analytics, paper trading, and AI-powered financial research.',
  openGraph: {
    title: 'Stock Mastery — Indian Stock Market Intelligence',
    description:
      'Live NSE & BSE market tracking, TradingView technical charting, multi-condition scanners, F&O analytics, paper trading, and AI-powered financial research.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Mastery — Indian Stock Market Intelligence',
    description:
      'Live NSE & BSE market tracking, TradingView technical charting, multi-condition scanners, F&O analytics, paper trading, and AI-powered financial research.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakarta.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 antialiased selection:bg-blue-500/20"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
