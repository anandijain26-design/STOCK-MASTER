'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2 } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { PriceChange } from '@/src/components/PriceChange';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import {
  PREBUILT_SCANS,
  runScanner,
  ScannableStock,
  ScannerCondition,
  ScannerField,
  ScannerOperator,
} from '@/src/lib/scanner-engine';

const FIELD_OPTIONS: Array<{ value: ScannerField; label: string }> = [
  { value: 'rsi14', label: 'RSI (14)' },
  { value: 'price', label: 'Close Price (₹)' },
  { value: 'changePercent', label: 'Change %' },
  { value: 'ema20', label: 'EMA 20' },
  { value: 'ema50', label: 'EMA 50' },
  { value: 'ema200', label: 'EMA 200' },
  { value: 'sma50', label: 'SMA 50' },
  { value: 'sma200', label: 'SMA 200' },
  { value: 'relativeVolume', label: 'Relative Volume (x)' },
  { value: 'macd', label: 'MACD Line' },
  { value: 'macdSignal', label: 'MACD Signal' },
  { value: 'roe', label: 'ROE %' },
  { value: 'roce', label: 'ROCE %' },
  { value: 'debtToEquity', label: 'Debt / Equity' },
  { value: 'peRatio', label: 'P/E Ratio' },
];

export default function ScannersPage() {
  const { t, language, user, getIdToken, openAuthModal } = useApp();
  const [stocks, setStocks] = useState<ScannableStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrebuiltId, setSelectedPrebuiltId] = useState<string>('above_50ema');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('Momentum Volume Breakout');
  const [customConditions, setCustomConditions] = useState<ScannerCondition[]>([
    { field: 'rsi14', operator: '>', compareTo: 'VALUE', value: 55 },
    { field: 'price', operator: '>', compareTo: 'ema50' },
    { field: 'relativeVolume', operator: '>', compareTo: 'VALUE', value: 1.2 },
  ]);
  const [savedList, setSavedList] = useState<Array<{ id: number; name: string; conditions: ScannerCondition[] }>>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/market/stocks?scope=leaders')
      .then((r) => r.json())
      .then((d) => setStocks(d.stocks ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/user/scanners', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const j = await res.json();
        setSavedList(j.scanners ?? []);
      }
    })();
  }, [user, getIdToken]);

  const activePrebuilt = PREBUILT_SCANS.find((s) => s.id === selectedPrebuiltId) ?? PREBUILT_SCANS[0];

  const results = useMemo(() => {
    if (customMode) {
      return runScanner(stocks, customConditions);
    }
    return runScanner(stocks, activePrebuilt.conditions, activePrebuilt.specialFilter);
  }, [stocks, customMode, customConditions, activePrebuilt]);

  const handleSaveCustom = async () => {
    if (!user) return openAuthModal();
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/user/scanners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: customName, frequency: '1D', conditions: customConditions }),
    });
    if (res.ok) {
      const j = await res.json();
      setSavedList((prev) => [j.scanner, ...prev]);
      setToast(language === 'hi' ? 'कस्टम स्कैनर सहेजा गया' : 'Custom scanner saved to your account');
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <TerminalShell breadcrumb={t.nav.scanners}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'उन्नत भारतीय स्टॉक स्कैनर (Prebuilt & Custom)'
                : 'Advanced Technical & Fundamental Stock Scanners'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {language === 'hi'
                ? 'लाइव डेटा पर प्री-बिल्ट स्कैन चलाएं या मल्टी-कंडीशन कस्टम स्कैनर बनाएं।'
                : 'Screen NSE equities using prebuilt momentum, trend, volume, and fundamental scans or multi-condition custom rules.'}
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                !customMode ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              {language === 'hi' ? 'प्री-बिल्ट स्कैन' : 'Prebuilt Scans'}
            </button>
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                customMode ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              {language === 'hi' ? 'कस्टम स्कैनर बिल्डर' : 'Custom Builder'}
            </button>
          </div>
        </div>

        {!customMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {PREBUILT_SCANS.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => setSelectedPrebuiltId(scan.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  selectedPrebuiltId === scan.id
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-[11px] text-slate-500">{scan.category}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                  {language === 'hi' ? scan.nameHi : scan.name}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                aria-label="Custom scanner name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-sm font-medium w-72"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCustomConditions((prev) => [
                      ...prev,
                      { field: 'rsi14', operator: '>', compareTo: 'VALUE', value: 50 },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition (AND)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.common.save}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {customConditions.map((cond, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                  {idx > 0 && <span className="font-mono text-blue-500 font-semibold">AND</span>}
                  <select
                    aria-label={`Condition ${idx + 1} field`}
                    value={cond.field}
                    onChange={(e) => {
                      const next = [...customConditions];
                      next[idx] = { ...cond, field: e.target.value as ScannerField };
                      setCustomConditions(next);
                    }}
                    className="h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label={`Condition ${idx + 1} operator`}
                    value={cond.operator}
                    onChange={(e) => {
                      const next = [...customConditions];
                      next[idx] = { ...cond, operator: e.target.value as ScannerOperator };
                      setCustomConditions(next);
                    }}
                    className="h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono"
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                  </select>

                  <select
                    aria-label={`Condition ${idx + 1} compare target`}
                    value={cond.compareTo}
                    onChange={(e) => {
                      const next = [...customConditions];
                      next[idx] = {
                        ...cond,
                        compareTo: e.target.value as ScannerCondition['compareTo'],
                      };
                      setCustomConditions(next);
                    }}
                    className="h-8 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100"
                  >
                    <option value="VALUE">Constant Value</option>
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {cond.compareTo === 'VALUE' && (
                    <input
                      type="number"
                      step="any"
                      aria-label={`Condition ${idx + 1} value`}
                      value={cond.value ?? 0}
                      onChange={(e) => {
                        const next = [...customConditions];
                        next[idx] = { ...cond, value: Number(e.target.value) };
                        setCustomConditions(next);
                      }}
                      className="h-8 w-24 px-2.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono"
                    />
                  )}

                  {customConditions.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove condition"
                      onClick={() => setCustomConditions((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {savedList.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Saved:</span>
                {savedList.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setCustomName(sc.name);
                      setCustomConditions(sc.conditions);
                    }}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            )}
            {toast && <div className="text-xs text-emerald-500">{toast}</div>}
          </div>
        )}

        {/* Scan Output Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {customMode ? customName : language === 'hi' ? activePrebuilt.nameHi : activePrebuilt.name}
              </h2>
              {!customMode && (
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? activePrebuilt.descriptionHi : activePrebuilt.description}
                </p>
              )}
            </div>
            <span className="font-mono text-xs font-medium text-blue-500">
              {results.length} {language === 'hi' ? 'मिलान' : 'Matches'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-2.5 px-4 font-medium">{t.common.symbol}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t.common.price}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t.common.change}</th>
                  <th className="py-2.5 px-4 font-medium text-right">RSI (14)</th>
                  <th className="py-2.5 px-4 font-medium text-right">EMA 50</th>
                  <th className="py-2.5 px-4 font-medium text-right">Rel Vol</th>
                  <th className="py-2.5 px-4 font-medium text-right">Supertrend</th>
                  <th className="py-2.5 px-4 font-medium text-right">ROE %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      {t.common.loading}
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      No stocks currently match all scanner criteria. Try adjusting threshold values.
                    </td>
                  </tr>
                ) : (
                  results.map((s) => (
                    <tr
                      key={s.symbol}
                      className="border-b last:border-0 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-4">
                        <Link
                          href={`/stocks/${s.symbol}`}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {s.symbol}
                        </Link>
                        <div className="text-xs text-slate-500 truncate max-w-[190px]">{s.companyName}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatINR(s.price)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs">
                        <PriceChange change={null} changePercent={s.changePercent} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.rsi14 !== null ? s.rsi14.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.ema50 ? formatINR(s.ema50) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.relativeVolume !== null ? `${s.relativeVolume}x` : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right text-xs font-medium ${
                          s.supertrendSignal === 'BULLISH'
                            ? 'text-emerald-500'
                            : s.supertrendSignal === 'BEARISH'
                              ? 'text-red-500'
                              : 'text-slate-500'
                        }`}
                      >
                        {s.supertrendSignal}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {s.roe !== null ? `${s.roe}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
