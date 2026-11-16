import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/src/components/AppProviders';

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
      className="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 antialiased selection:bg-blue-500/20 font-sans"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
