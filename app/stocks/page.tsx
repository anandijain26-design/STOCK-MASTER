'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { PriceChange } from '@/src/components/PriceChange';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface StockDirectoryRow {
  symbol: string;
  bseCode: string;
  isin: string;
  series?: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCapCategory: string;
  isFno: boolean;
  price: number | null;
  change: number | null;
  changePercent: number;
  volume: number;
  rsi14: number | null;
  supertrendSignal: string;
  peRatio: number | null;
  roe: number | null;
  status: string;
}

export default function StocksDirectoryPage() {
  const { t, language, autoRefresh } = useApp();
  const [stocks, setStocks] = useState<StockDirectoryRow[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cap, setCap] = useState('ALL');
  const [series, setSeries] = useState('ALL');
  const [sector, setSector] = useState('ALL');
  const [fnoOnly, setFnoOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalUniverse, setTotalUniverse] = useState(2647);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 36;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);

  const loadStocks = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          cap,
          series,
          sector,
          fno: String(fnoOnly),
        });
        if (debouncedQuery) params.set('q', debouncedQuery);

        const res = await fetch(`/api/market/stocks?${params.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setStocks(json.stocks ?? []);
          setSectors(json.sectors ?? []);
          setTotal(json.total ?? 0);
          setTotalUniverse(json.totalUniverse ?? 2647);
          setTotalPages(json.totalPages ?? 1);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, cap, series, sector, fnoOnly, debouncedQuery]
  );

  useAutoRefresh(() => loadStocks(true), autoRefresh, 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadStocks(false);
    });
    return () => {
      active = false;
    };
  }, [loadStocks]);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(total, page * pageSize);

  return (
    <TerminalShell breadcrumb={t.nav.stocks}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'संपूर्ण NSE व BSE भारतीय शेयर निर्देशिका'
                : 'Complete Indian Stock Market Database (NSE & BSE)'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {language === 'hi'
                ? `सभी ${totalUniverse.toLocaleString('en-IN')} सूचीबद्ध भारतीय शेयर खोजें व लाइव कीमतें देखें।`
                : `Search and explore all ${totalUniverse.toLocaleString('en-IN')} actively listed NSE Indian equities with live prices, series, and technicals.`}
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Showing {startIdx}–{endIdx} of {total.toLocaleString('en-IN')} matching stocks
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Filter all Indian stocks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search all ${totalUniverse.toLocaleString('en-IN')} stocks (e.g. IRFC, MRF, ZOMATO, RELIANCE)...`}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#080D1A] overflow-x-auto">
            {['ALL', 'Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCap(c);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  cap === c
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by NSE series"
            value={series}
            onChange={(e) => {
              setSeries(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Series (EQ/BE/BZ)</option>
            <option value="EQ">Series EQ (Equity)</option>
            <option value="BE">Series BE (Trade-to-Trade)</option>
            <option value="BZ">Series BZ</option>
          </select>

          <select
            aria-label="Filter by sector"
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Sectors</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer px-2 text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={fnoOnly}
              onChange={(e) => {
                setFnoOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-slate-400"
            />
            <span>NSE F&O Only</span>
          </label>
        </div>

        {/* Directory Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">{t.common.symbol} / ISIN</th>
                  <th className="py-3 px-4 font-medium">{t.common.sector} · Cap</th>
                  <th className="py-3 px-4 font-medium text-right">{t.common.price}</th>
                  <th className="py-3 px-4 font-medium text-right">{t.common.change}</th>
                  <th className="py-3 px-4 font-medium text-right">{t.common.volume}</th>
                  <th className="py-3 px-4 font-medium text-right">P/E</th>
                  <th className="py-3 px-4 font-medium text-right">ROE %</th>
                  <th className="py-3 px-4 font-medium text-right">RSI (14)</th>
                  <th className="py-3 px-4 font-medium text-right">{t.common.action}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                      {t.common.loading}
                    </td>
                  </tr>
                ) : stocks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                      No matching NSE/BSE securities found. Try clearing filters or searching another symbol.
                    </td>
                  </tr>
                ) : (
                  stocks.map((s) => (
                    <tr
                      key={s.symbol}
                      className="border-b last:border-0 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stocks/${s.symbol}`}
                            className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {s.symbol}
                          </Link>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {s.series ?? 'EQ'}
                          </span>
                          {s.isFno && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                              F&O
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                          {s.companyName}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{s.sector}</div>
                        <div className="text-slate-500">{s.marketCapCategory}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">
                        {formatINR(s.price)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs">
                        <PriceChange change={s.change} changePercent={s.changePercent} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-500">
                        {formatIndianNumber(s.volume)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.peRatio ? s.peRatio.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.roe !== null ? `${s.roe.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.rsi14 !== null ? s.rsi14.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-3 text-xs font-medium whitespace-nowrap">
                          <Link
                            href={`/paper-trading?symbol=${encodeURIComponent(s.symbol)}`}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            Demo Trade
                          </Link>
                          <Link
                            href={`/stocks/${s.symbol}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {language === 'hi' ? 'विश्लेषण →' : 'Analyze →'}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-mono text-slate-500">
              Page {page} of {totalPages} · {total.toLocaleString('en-IN')} stocks
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
