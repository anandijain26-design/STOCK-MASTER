'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { PriceChange } from '@/src/components/PriceChange';
import { formatIndianNumber } from '@/src/lib/i18n';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface MarketIndex {
  id: string;
  name: string;
  exchange: string;
  category: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  timestamp: string | null;
  isDelayed: boolean;
  delayNote: string;
  status: string;
}

export default function MarketsPage() {
  const { t, language, autoRefresh } = useApp();
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; istTimeLabel: string } | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/market/overview', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setIndices(json.indices ?? []);
        setMarketStatus(json.marketStatus ?? null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useAutoRefresh(() => load(true), autoRefresh, 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    category === 'ALL' ? indices : indices.filter((i) => i.category === category);

  return (
    <TerminalShell breadcrumb={t.nav.markets}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'NSE, BSE, सेक्टोरल और कमोडिटी सूचकांक'
                : 'NSE, BSE, Sectoral & Commodity Indices'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {language === 'hi'
                ? 'लाइव बेंचमार्क, ब्रॉड मार्केट, सेक्टर सूचकांक और इंडिया VIX डेटा।'
                : 'Live benchmark, broad market, sectoral indices, India VIX, and MCX commodity references with feed status.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {marketStatus && (
              <span className="font-mono tabular-nums text-slate-500">
                {marketStatus.isOpen ? t.common.marketOpen : t.common.marketClosed} · {marketStatus.istTimeLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t.common.refresh}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 w-fit">
          {['ALL', 'Benchmark', 'Broad', 'Sectoral', 'Volatility', 'Commodity'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Index</th>
                <th className="py-3 px-4 font-medium">{t.common.exchange}</th>
                <th className="py-3 px-4 font-medium text-right">Last Price</th>
                <th className="py-3 px-4 font-medium text-right">{t.common.change}</th>
                <th className="py-3 px-4 font-medium text-right">Day Low / High</th>
                <th className="py-3 px-4 font-medium text-right">52W Low / High</th>
                <th className="py-3 px-4 font-medium text-right">Feed Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((idx) => (
                <tr
                  key={idx.id}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{idx.name}</div>
                    <div className="text-xs text-slate-500">{idx.category}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {idx.exchange}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {idx.price !== null ? formatIndianNumber(idx.price) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-xs">
                    <PriceChange change={idx.change} changePercent={idx.changePercent} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-500">
                    {idx.dayLow && idx.dayHigh
                      ? `${formatIndianNumber(idx.dayLow)} – ${formatIndianNumber(idx.dayHigh)}`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-500">
                    {idx.fiftyTwoWeekLow && idx.fiftyTwoWeekHigh
                      ? `${formatIndianNumber(idx.fiftyTwoWeekLow)} – ${formatIndianNumber(idx.fiftyTwoWeekHigh)}`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-500">
                    {idx.status === 'unavailable'
                      ? t.common.unavailable
                      : idx.isDelayed
                        ? t.common.delayed
                        : t.common.live}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    {t.common.unavailable}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TerminalShell>
  );
}
