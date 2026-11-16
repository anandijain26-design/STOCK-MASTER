'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { PriceChange } from '@/src/components/PriceChange';
import { TradingChart } from '@/src/components/TradingChart';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import { OHLCVBar } from '@/src/lib/indicators';
import { ALL_INDIAN_STOCKS } from '@/src/lib/nse-universe';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface IndexItem {
  id: string;
  name: string;
  exchange: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  status: string;
  timestamp: string | null;
  isDelayed: boolean;
}

interface MoverRow {
  symbol: string;
  companyName: string;
  sector: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  rsi14: number | null;
  supertrend: string;
}

interface OverviewPayload {
  marketStatus: { isOpen: boolean; session: string; istTimeLabel: string };
  indices: IndexItem[];
  breadth: {
    totalTracked: number;
    advances: number;
    declines: number;
    unchanged: number;
    advanceDeclineRatio: number;
  };
  topGainers: MoverRow[];
  topLosers: MoverRow[];
  mostActive: MoverRow[];
  sectorPerformance: Array<{
    sector: string;
    avgChangePercent: number;
    advances: number;
    declines: number;
    stockCount: number;
  }>;
  announcements: Array<{ id: number; title: string; body: string; severity: string }>;
  fetchedAt: string;
}

export default function DashboardPage() {
  const { t, language, user, getIdToken, autoRefresh } = useApp();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [niftyBars, setNiftyBars] = useState<OHLCVBar[]>([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [moverTab, setMoverTab] = useState<'gainers' | 'losers' | 'active'>('gainers');
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([
    'RELIANCE',
    'TCS',
    'HDFCBANK',
    'INFY',
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [ovRes, chartRes] = await Promise.all([
        fetch('/api/market/overview', { cache: 'no-store' }),
        fetch(`/api/market/stock/%5ENSEI?timeframe=${encodeURIComponent(timeframe)}`, { cache: 'no-store' }),
      ]);
      if (!ovRes.ok) throw new Error('Failed to load market overview');
      const ovJson = await ovRes.json();
      setData(ovJson);
      if (chartRes.ok) {
        const chJson = await chartRes.json();
        setNiftyBars(chJson.bars ?? []);
      }
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Unable to reach market feeds.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [timeframe]);

  useAutoRefresh(() => loadOverview(true), autoRefresh, 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadOverview();
    });
    return () => {
      active = false;
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/user/watchlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const j = await res.json();
        const first = j.watchlists?.[0];
        if (first && Array.isArray(first.symbols) && first.symbols.length > 0) {
          setWatchlistSymbols(first.symbols.slice(0, 6));
        }
      }
    })();
  }, [user, getIdToken]);

  const topBenchmarks = data?.indices.slice(0, 4) ?? [];
  const niftyQuote = data?.indices.find((i) => i.id === 'NIFTY50');
  const activeRows =
    moverTab === 'gainers'
      ? data?.topGainers ?? []
      : moverTab === 'losers'
        ? data?.topLosers ?? []
        : data?.mostActive ?? [];

  return (
    <TerminalShell breadcrumb={t.nav.dashboard}>
      <div className="space-y-6">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.dashboard.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t.dashboard.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            {data && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={data.marketStatus.isOpen ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                  {data.marketStatus.isOpen ? t.common.marketOpen : t.common.marketClosed}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{data.marketStatus.istTimeLabel}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => loadOverview(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t.common.refresh}</span>
            </button>
          </div>
        </div>

        {/* Platform Announcements (if any from Admin) */}
        {data?.announcements && data.announcements.length > 0 && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm">
            {data.announcements.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{a.title}:</span>
                <span className="text-slate-700 dark:text-slate-300">{a.body}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Benchmark KPI Strip */}
        <section aria-label={t.dashboard.indicesTitle}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(loading && !data ? [1, 2, 3, 4] : topBenchmarks).map((idx, i) =>
              typeof idx === 'number' ? (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 animate-pulse"
                />
              ) : (
                <div
                  key={idx.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {idx.name}
                    </span>
                    <span>
                      {idx.exchange} · {idx.status === 'unavailable' ? t.common.unavailable : idx.isDelayed ? t.common.delayed : t.common.live}
                    </span>
                  </div>
                  <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                    {idx.price !== null
                      ? idx.id === 'INDIAVIX'
                        ? idx.price.toFixed(2)
                        : formatIndianNumber(idx.price)
                      : '—'}
                  </div>
                  <div className="mt-1 text-xs">
                    <PriceChange change={idx.change} changePercent={idx.changePercent} />
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Primary Split: NIFTY 50 Live Chart + Balanced Right Column */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                NIFTY 50 · {language === 'hi' ? 'तकनीकी चार्ट' : 'Benchmark Chart'}
              </h2>
              <Link
                href="/charts"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>{language === 'hi' ? 'प्रो चार्ट वर्कस्पेस खोलें' : 'Open Pro Chart Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {niftyBars.length > 0 ? (
              <TradingChart
                symbol="NIFTY 50"
                bars={niftyBars}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                height={430}
              />
            ) : (
              <div className="h-[430px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center justify-center text-sm text-slate-500">
                {loading ? t.common.loading : t.common.unavailable}
              </div>
            )}

            {/* Balanced NIFTY Range & Quick Action Strip */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-slate-500">NIFTY Day High / Low</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  {niftyQuote?.dayHigh ? `${formatIndianNumber(niftyQuote.dayHigh)} / ${formatIndianNumber(niftyQuote.dayLow)}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">52-Week High / Low</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  {niftyQuote?.fiftyTwoWeekHigh
                    ? `${formatIndianNumber(niftyQuote.fiftyTwoWeekHigh)} / ${formatIndianNumber(niftyQuote.fiftyTwoWeekLow)}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Complete NSE Database</div>
                <Link href="/stocks" className="font-mono font-semibold text-blue-500 hover:underline mt-0.5 inline-block">
                  {ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} Listed Equities →
                </Link>
              </div>
              <div>
                <div className="text-slate-500">24/7 Practice Desk</div>
                <Link href="/paper-trading" className="font-mono font-semibold text-emerald-500 hover:underline mt-0.5 inline-block">
                  Launch Demo Simulator →
                </Link>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-4">
            {/* Market Breadth */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                {t.dashboard.marketBreadth}
              </h2>
              {data ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {t.dashboard.advances}: {data.breadth.advances}
                    </span>
                    <span className="text-slate-500">
                      {t.dashboard.unchanged}: {data.breadth.unchanged}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {t.dashboard.declines}: {data.breadth.declines}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{
                        width: `${
                          data.breadth.totalTracked > 0
                            ? (data.breadth.advances / data.breadth.totalTracked) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-red-500 h-full"
                      style={{
                        width: `${
                          data.breadth.totalTracked > 0
                            ? (data.breadth.declines / data.breadth.totalTracked) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between font-mono tabular-nums">
                    <span>A/D Ratio: {data.breadth.advanceDeclineRatio}</span>
                    <span>NIFTY Leaders: {data.breadth.totalTracked}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">{t.common.loading}</div>
              )}
            </div>

            {/* Sector Performance */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.dashboard.sectorPerformance}
                </h2>
                <Link href="/markets" className="text-xs text-blue-500 hover:underline">
                  {language === 'hi' ? 'सभी देखें' : 'All Indices'}
                </Link>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(data?.sectorPerformance ?? []).map((sec) => (
                  <div
                    key={sec.sector}
                    className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-slate-100 dark:border-slate-800/70"
                  >
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                      {sec.sector}
                    </span>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-slate-500">
                        {sec.advances}↑/{sec.declines}↓
                      </span>
                      <span
                        className={
                          sec.avgChangePercent >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-red-600 dark:text-red-400 font-semibold'
                        }
                      >
                        {sec.avgChangePercent >= 0 ? '+' : ''}
                        {sec.avgChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links to AI Analyst & Paper Trading */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'hi' ? 'त्वरित टूल्स' : 'Quick Intelligence Desk'}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/ai-analyst"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.nav.aiAnalyst}
                </Link>
                <Link
                  href="/paper-trading"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.nav.paperTrading}
                </Link>
                <Link
                  href="/scanners"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.nav.scanners}
                </Link>
                <Link
                  href="/reports"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.nav.reports}
                </Link>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                {t.dashboard.quickWatchlist}:{' '}
                {watchlistSymbols.map((sym, i) => (
                  <React.Fragment key={sym}>
                    {i > 0 && ' · '}
                    <Link href={`/stocks/${sym}`} className="font-mono text-blue-500 hover:underline">
                      {sym}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Market Movers Data Grid */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#080D1A]">
              {(
                [
                  ['gainers', t.dashboard.topGainers],
                  ['losers', t.dashboard.topLosers],
                  ['active', t.dashboard.mostActive],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMoverTab(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    moverTab === key
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link href="/stocks" className="text-xs font-medium text-blue-500 hover:underline">
              {language === 'hi'
                ? 'संपूर्ण NSE/BSE शेयर निर्देशिका →'
                : `View All ${ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} NSE Stocks →`}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-medium">{t.common.symbol}</th>
                  <th className="py-2.5 px-4 font-medium">{t.common.sector}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t.common.price}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t.common.change}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t.common.volume}</th>
                  <th className="py-2.5 px-4 font-medium text-right">RSI (14)</th>
                  <th className="py-2.5 px-4 font-medium text-right">Supertrend</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/stocks/${row.symbol}`}
                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {row.symbol}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {row.companyName}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {row.sector}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">
                      {formatINR(row.price)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs">
                      <PriceChange change={row.change} changePercent={row.changePercent} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                      {formatIndianNumber(row.volume)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                      {row.rsi14 !== null ? row.rsi14.toFixed(1) : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right text-xs font-medium ${
                        row.supertrend === 'BULLISH'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.supertrend === 'BEARISH'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {row.supertrend}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TerminalShell>
  );
}
