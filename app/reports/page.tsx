'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import { MarkdownProse } from '@/src/components/MarkdownProse';

interface DailyReportRecord {
  id: number;
  reportDate: string;
  marketSummary: {
    nifty?: { price?: number; change?: number; changePercent?: number };
    sensex?: { price?: number; change?: number; changePercent?: number };
    bankNifty?: { price?: number; change?: number; changePercent?: number };
    indiaVix?: { price?: number; changePercent?: number };
    sentiment?: string;
    advances?: number;
    declines?: number;
    totalTracked?: number;
  };
  topMovers: {
    topGainers?: Array<{ symbol: string; companyName: string; price: number; changePercent: number; volume: number }>;
    topLosers?: Array<{ symbol: string; companyName: string; price: number; changePercent: number; volume: number }>;
    mostActiveVolume?: Array<{ symbol: string; price: number; changePercent: number; volume: number; turnoverCr: number }>;
    near52High?: string[];
    near52Low?: string[];
  };
  sectorAnalysis: {
    bestSectors?: Array<{ sector: string; avgChangePercent: number }>;
    worstSectors?: Array<{ sector: string; avgChangePercent: number }>;
  };
  technicalSummary: {
    overboughtRsi70?: string[];
    oversoldRsi30?: string[];
    macdBullishCrossovers?: string[];
    supertrendBullishCount?: number;
    supertrendBearishCount?: number;
    breakouts?: string[];
  };
  newsAndFundamentals: {
    headlines?: Array<{ title: string; source: string; category: string }>;
  };
  nextSessionOutlook: {
    niftySupport?: number[];
    niftyResistance?: number[];
    bankNiftySupport?: number[];
    bankNiftyResistance?: number[];
    stocksToMonitor?: string[];
  };
  aiNarrativeEn: string;
  aiNarrativeHi: string | null;
  generatedAt: string;
}

export default function DailyReportsPage() {
  const { t, language } = useApp();
  const [reports, setReports] = useState<DailyReportRecord[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchReports();
    });
    return () => {
      active = false;
    };
  }, []);

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) {
        await fetchReports();
        setSelectedIdx(0);
      }
    } finally {
      setGenerating(false);
    }
  };

  const active = reports[selectedIdx] ?? null;

  const handleDownloadPdf = () => {
    if (!active) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Stock Mastery - After-Market Daily Report (${active.reportDate})`, 14, 18);
    doc.setFontSize(10);
    const ms = active.marketSummary;
    doc.text(
      `NIFTY 50: ${ms.nifty?.price ?? '—'} (${ms.nifty?.changePercent ?? 0}%) | SENSEX: ${ms.sensex?.price ?? '—'} | BANK NIFTY: ${ms.bankNifty?.price ?? '—'}`,
      14,
      28
    );
    doc.text(
      `Sentiment: ${ms.sentiment ?? '—'} | Advances: ${ms.advances ?? 0} | Declines: ${ms.declines ?? 0} | India VIX: ${ms.indiaVix?.price ?? '—'}`,
      14,
      35
    );

    const narrative = language === 'hi' && active.aiNarrativeHi ? active.aiNarrativeHi : active.aiNarrativeEn;
    const lines = doc.splitTextToSize(narrative, 180);
    doc.text(lines.slice(0, 35), 14, 46);
    doc.save(`stock-mastery-daily-report-${active.reportDate}.pdf`);
  };

  return (
    <TerminalShell breadcrumb={t.nav.reports}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.reports.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.reports.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateNow}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? t.common.loading : t.reports.generateNow}</span>
            </button>
            {active && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.common.downloadPdf}</span>
              </button>
            )}
          </div>
        </div>

        {/* Historical Archive Selector */}
        {reports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">{t.reports.historicalArchive}:</span>
            {reports.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`px-3 py-1 rounded-md font-mono ${
                  selectedIdx === i
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {r.reportDate}
              </button>
            ))}
          </div>
        )}

        {loading && !active ? (
          <div className="p-10 text-center text-sm text-slate-500">{t.common.loading}</div>
        ) : active ? (
          <div className="space-y-6">
            {/* A. Overall Market Summary */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{t.reports.overallSummary}</h2>
                <span className="font-mono text-xs text-slate-500">
                  {active.reportDate} · {active.marketSummary.sentiment}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">NIFTY 50</div>
                  <div className="font-mono tabular-nums font-bold mt-1">
                    {formatIndianNumber(active.marketSummary.nifty?.price)}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {active.marketSummary.nifty?.changePercent ?? 0}%
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">SENSEX</div>
                  <div className="font-mono tabular-nums font-bold mt-1">
                    {formatIndianNumber(active.marketSummary.sensex?.price)}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {active.marketSummary.sensex?.changePercent ?? 0}%
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">BANK NIFTY</div>
                  <div className="font-mono tabular-nums font-bold mt-1">
                    {formatIndianNumber(active.marketSummary.bankNifty?.price)}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {active.marketSummary.bankNifty?.changePercent ?? 0}%
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">India VIX</div>
                  <div className="font-mono tabular-nums font-bold mt-1">
                    {active.marketSummary.indiaVix?.price?.toFixed(2) ?? '—'}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Advances / Declines</div>
                  <div className="font-mono tabular-nums font-bold mt-1">
                    <span className="text-emerald-500">{active.marketSummary.advances}</span> /{' '}
                    <span className="text-red-500">{active.marketSummary.declines}</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <MarkdownProse
                  content={language === 'hi' && active.aiNarrativeHi ? active.aiNarrativeHi : active.aiNarrativeEn}
                />
              </div>
            </section>

            {/* B. Top Market Movements */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
              <h2 className="text-base font-semibold">{t.reports.topMovers}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-emerald-500 mb-2">
                    {t.dashboard.topGainers} (Top 10)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {(active.topMovers.topGainers ?? []).slice(0, 10).map((g) => (
                      <div key={g.symbol} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <Link href={`/stocks/${g.symbol}`} className="font-mono font-semibold text-blue-500 hover:underline">
                          {g.symbol}
                        </Link>
                        <div className="font-mono tabular-nums space-x-3">
                          <span>{formatINR(g.price)}</span>
                          <span className="text-emerald-500">+{g.changePercent?.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-red-500 mb-2">
                    {t.dashboard.topLosers} (Top 10)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {(active.topMovers.topLosers ?? []).slice(0, 10).map((l) => (
                      <div key={l.symbol} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <Link href={`/stocks/${l.symbol}`} className="font-mono font-semibold text-blue-500 hover:underline">
                          {l.symbol}
                        </Link>
                        <div className="font-mono tabular-nums space-x-3">
                          <span>{formatINR(l.price)}</span>
                          <span className="text-red-500">{l.changePercent?.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-2">
                <span>Near 52W High: {(active.topMovers.near52High ?? []).join(', ') || 'None'}</span>
                <span>Near 52W Low: {(active.topMovers.near52Low ?? []).join(', ') || 'None'}</span>
              </div>
            </section>

            {/* C, D, E, F Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
                <h2 className="text-base font-semibold">{t.reports.sectorAnalysis}</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-emerald-500 font-semibold mb-1.5">Best Sectors</div>
                    {(active.sectorAnalysis.bestSectors ?? []).map((s) => (
                      <div key={s.sector} className="flex justify-between py-1">
                        <span>{s.sector}</span>
                        <span className={`font-mono ${s.avgChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {s.avgChangePercent >= 0 ? `+${s.avgChangePercent}` : s.avgChangePercent}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-red-500 font-semibold mb-1.5">Weak Sectors</div>
                    {(active.sectorAnalysis.worstSectors ?? []).map((s) => (
                      <div key={s.sector} className="flex justify-between py-1">
                        <span>{s.sector}</span>
                        <span className="font-mono text-red-500">{s.avgChangePercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-2 text-xs">
                <h2 className="text-base font-semibold mb-2">{t.reports.technicalSignals}</h2>
                <div>RSI &gt; 70 (Overbought): <span className="font-mono">{(active.technicalSummary.overboughtRsi70 ?? []).join(', ') || 'None'}</span></div>
                <div>RSI &lt; 30 (Oversold): <span className="font-mono">{(active.technicalSummary.oversoldRsi30 ?? []).join(', ') || 'None'}</span></div>
                <div>MACD Bullish Crossovers: <span className="font-mono">{(active.technicalSummary.macdBullishCrossovers ?? []).join(', ') || 'None'}</span></div>
                <div>Breakouts (20D High): <span className="font-mono">{(active.technicalSummary.breakouts ?? []).join(', ') || 'None'}</span></div>
                <div>
                  Supertrend Regime: <span className="font-mono text-emerald-500">{active.technicalSummary.supertrendBullishCount} Bullish</span> /{' '}
                  <span className="font-mono text-red-500">{active.technicalSummary.supertrendBearishCount} Bearish</span>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-2">
                <h2 className="text-base font-semibold">{t.reports.newsFundamentals}</h2>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {(active.newsAndFundamentals.headlines ?? []).map((h, i) => (
                    <li key={i} className="py-1 border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                      <span className="font-medium text-slate-900 dark:text-white">{h.title}</span>{' '}
                      <span className="text-slate-500">· {h.source}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-2 text-xs">
                <h2 className="text-base font-semibold mb-2">{t.reports.nextOutlook}</h2>
                <div className="font-mono">
                  NIFTY Support: {(active.nextSessionOutlook.niftySupport ?? []).join(' / ') || '—'} · Resistance:{' '}
                  {(active.nextSessionOutlook.niftyResistance ?? []).join(' / ') || '—'}
                </div>
                <div className="font-mono">
                  BANK NIFTY Support: {(active.nextSessionOutlook.bankNiftySupport ?? []).join(' / ') || '—'} · Resistance:{' '}
                  {(active.nextSessionOutlook.bankNiftyResistance ?? []).join(' / ') || '—'}
                </div>
                <div>
                  Stocks to Monitor:{' '}
                  <span className="font-mono font-semibold text-blue-500">
                    {(active.nextSessionOutlook.stocksToMonitor ?? []).join(', ') || 'NIFTY 50 Leaders'}
                  </span>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </TerminalShell>
  );
}
