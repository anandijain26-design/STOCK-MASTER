'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import { OptionStrikeRow } from '@/src/lib/fno-math';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface FnoPayload {
  underlying: string;
  spotQuote: { price: number | null; changePercent: number | null; timestamp: string | null };
  indiaVix: number;
  atmStrike: number;
  expiries: string[];
  selectedExpiry: string;
  daysToExpiry: number;
  lotSize: number;
  pcr: number;
  maxPain: number | null;
  keyLevels: { majorResistanceStrike: number; majorSupportStrike: number };
  futuresSummary: { nearMonthPrice: number; basis: number; basisPercent: number; regime: string } | null;
  isLiveExchangeChain: boolean;
  feedNote: string;
  optionChain: OptionStrikeRow[];
  stockBuildup: Array<{
    symbol: string;
    companyName: string;
    price: number | null;
    changePercent: number;
    relativeVolume: number;
    oiChangeEstimatePct: number;
    buildup: string;
  }>;
}

export default function FnoAnalyticsPage() {
  const { t, language, autoRefresh } = useApp();
  const [symbol, setSymbol] = useState('NIFTY');
  const [expiry, setExpiry] = useState('');
  const [data, setData] = useState<FnoPayload | null>(null);
  const [showGreeks, setShowGreeks] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadFno = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams({ symbol });
      if (expiry) qs.set('expiry', expiry);
      const res = await fetch(`/api/market/fno?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!expiry && json.selectedExpiry) setExpiry(json.selectedExpiry);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [symbol, expiry]);

  useAutoRefresh(() => loadFno(true), autoRefresh, 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadFno();
    });
    return () => {
      active = false;
    };
  }, [loadFno]);

  return (
    <TerminalShell breadcrumb={t.nav.fno}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'NSE F&O डेरिवेटिव्स, ऑप्शन चेन व ग्रीक्स विश्लेषण'
                : 'NSE F&O Derivatives, Option Chain & OI Analysis'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data?.feedNote ?? 'Loading derivatives telemetry...'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select F&O underlying"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setExpiry('');
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">BANK NIFTY</option>
              <option value="FINNIFTY">FINNIFTY</option>
              <option value="MIDCPNIFTY">MIDCAP NIFTY</option>
              <option value="RELIANCE">RELIANCE (Stock F&O)</option>
              <option value="TCS">TCS (Stock F&O)</option>
              <option value="HDFCBANK">HDFCBANK (Stock F&O)</option>
              <option value="SBIN">SBIN (Stock F&O)</option>
            </select>

            {data?.expiries && (
              <select
                aria-label="Select expiry date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 text-xs font-mono"
              >
                {data.expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    Expiry: {exp}
                  </option>
                ))}
              </select>
            )}

            <label className="inline-flex items-center gap-1.5 text-xs px-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGreeks}
                onChange={(e) => setShowGreeks(e.target.checked)}
              />
              <span>Option Greeks</span>
            </label>
          </div>
        </div>

        {/* Summary KPI Strip */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              ['Spot Price', formatIndianNumber(data.spotQuote.price)],
              [
                'Futures (Near)',
                data.futuresSummary
                  ? `${formatIndianNumber(data.futuresSummary.nearMonthPrice)} (${data.futuresSummary.basis >= 0 ? '+' : ''}${data.futuresSummary.basis})`
                  : '—',
              ],
              ['Put-Call Ratio (PCR)', data.pcr.toFixed(2)],
              ['Max Pain Strike', formatIndianNumber(data.maxPain)],
              ['Major Call OI (Res)', formatIndianNumber(data.keyLevels.majorResistanceStrike)],
              ['Major Put OI (Sup)', formatIndianNumber(data.keyLevels.majorSupportStrike)],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-3.5"
              >
                <div className="text-xs text-slate-500">{label}</div>
                <div className="font-mono tabular-nums text-base font-bold mt-1">{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Option Chain Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-sm">
              {symbol} Option Chain · Lot Size {data?.lotSize ?? '—'} · DTE {data?.daysToExpiry ?? '—'}d
            </span>
            <span className="font-mono text-slate-500">India VIX: {data?.indiaVix?.toFixed(2) ?? '—'}%</span>
          </div>
          <table className="w-full text-right border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-2">Call OI</th>
                <th className="py-2.5 px-2">Chg OI</th>
                <th className="py-2.5 px-2">IV%</th>
                {showGreeks && <th className="py-2.5 px-2">Delta</th>}
                <th className="py-2.5 px-2">Call LTP</th>
                <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white">
                  STRIKE
                </th>
                <th className="py-2.5 px-2">Put LTP</th>
                {showGreeks && <th className="py-2.5 px-2">Delta</th>}
                <th className="py-2.5 px-2">IV%</th>
                <th className="py-2.5 px-2">Chg OI</th>
                <th className="py-2.5 px-2">Put OI</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={showGreeks ? 11 : 9} className="py-8 text-center">
                    {t.common.loading}
                  </td>
                </tr>
              ) : (
                (data?.optionChain ?? []).map((row) => {
                  const isAtm = row.strike === data?.atmStrike;
                  return (
                    <tr
                      key={row.strike}
                      className={`border-b last:border-0 border-slate-100 dark:border-slate-800/60 ${
                        isAtm ? 'bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2 px-2">{formatIndianNumber(row.callOi)}</td>
                      <td className="py-2 px-2 text-emerald-500">{formatIndianNumber(row.callChangeInOi)}</td>
                      <td className="py-2 px-2">{row.callIv.toFixed(1)}</td>
                      {showGreeks && <td className="py-2 px-2">{row.callGreeks.delta.toFixed(2)}</td>}
                      <td className="py-2 px-2 font-semibold text-slate-900 dark:text-white">
                        {row.callLtp.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white">
                        {row.strike}
                      </td>
                      <td className="py-2 px-2 font-semibold text-slate-900 dark:text-white">
                        {row.putLtp.toFixed(2)}
                      </td>
                      {showGreeks && <td className="py-2 px-2">{row.putGreeks.delta.toFixed(2)}</td>}
                      <td className="py-2 px-2">{row.putIv.toFixed(1)}</td>
                      <td className="py-2 px-2 text-red-500">{formatIndianNumber(row.putChangeInOi)}</td>
                      <td className="py-2 px-2">{formatIndianNumber(row.putOi)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* F&O Stock Buildup Screener */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold">
              {language === 'hi'
                ? 'F&O लॉन्ग / शॉर्ट बिल्डअप विश्लेषण'
                : 'F&O Futures & OI Buildup Regime (Long / Short / Covering / Unwinding)'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-4">Symbol</th>
                  <th className="py-2.5 px-4 text-right">Spot Price</th>
                  <th className="py-2.5 px-4 text-right">Price Chg %</th>
                  <th className="py-2.5 px-4 text-right">Rel Volume</th>
                  <th className="py-2.5 px-4 text-right">Buildup Signal</th>
                </tr>
              </thead>
              <tbody>
                {(data?.stockBuildup ?? []).map((b) => (
                  <tr
                    key={b.symbol}
                    className="border-b last:border-0 border-slate-100 dark:border-slate-800/60"
                  >
                    <td className="py-2 px-4">
                      <Link href={`/stocks/${b.symbol}`} className="font-mono font-semibold text-blue-500 hover:underline">
                        {b.symbol}
                      </Link>
                      <span className="ml-2 text-slate-500">{b.companyName}</span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">{formatINR(b.price)}</td>
                    <td
                      className={`py-2 px-4 text-right font-mono tabular-nums ${
                        b.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {b.changePercent >= 0 ? '+' : ''}
                      {b.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">{b.relativeVolume}x</td>
                    <td className="py-2 px-4 text-right font-semibold">
                      <span
                        className={
                          b.buildup === 'LONG_BUILDUP' || b.buildup === 'SHORT_COVERING'
                            ? 'text-emerald-500'
                            : b.buildup === 'SHORT_BUILDUP' || b.buildup === 'LONG_UNWINDING'
                              ? 'text-red-500'
                              : 'text-slate-500'
                        }
                      >
                        {b.buildup.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
