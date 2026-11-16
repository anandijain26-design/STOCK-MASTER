'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { TradingChart } from '@/src/components/TradingChart';
import { StockPicker } from '@/src/components/StockPicker';
import { OHLCVBar } from '@/src/lib/indicators';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

export default function ProChartsPage() {
  const { t, language, user, getIdToken, autoRefresh } = useApp();
  const [layout, setLayout] = useState<'single' | 'dual'>('single');
  const [symbol1, setSymbol1] = useState('RELIANCE');
  const [symbol2, setSymbol2] = useState('TCS');
  const [compareSymbol, setCompareSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('1D');
  const [bars1, setBars1] = useState<OHLCVBar[]>([]);
  const [bars2, setBars2] = useState<OHLCVBar[]>([]);
  const [compareBars, setCompareBars] = useState<OHLCVBar[]>([]);
  const [savedCharts, setSavedCharts] = useState<Array<{ id: number; symbol: string; title: string; timeframe: string }>>([]);

  useEffect(() => {
    fetch(`/api/market/stock/${encodeURIComponent(symbol1)}?timeframe=${encodeURIComponent(timeframe)}`)
      .then((r) => r.json())
      .then((d) => setBars1(d.bars ?? []))
      .catch(() => {});
  }, [symbol1, timeframe]);

  useEffect(() => {
    if (layout !== 'dual') return;
    fetch(`/api/market/stock/${encodeURIComponent(symbol2)}?timeframe=${encodeURIComponent(timeframe)}`)
      .then((r) => r.json())
      .then((d) => setBars2(d.bars ?? []))
      .catch(() => {});
  }, [layout, symbol2, timeframe]);

  useEffect(() => {
    if (!compareSymbol) return;
    let active = true;
    fetch(`/api/market/stock/${encodeURIComponent(compareSymbol)}?timeframe=${encodeURIComponent(timeframe)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setCompareBars(d.bars ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [compareSymbol, timeframe]);

  useAutoRefresh(async () => {
    const tasks: Promise<void>[] = [
      fetch(`/api/market/stock/${encodeURIComponent(symbol1)}?timeframe=${encodeURIComponent(timeframe)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setBars1(d.bars ?? []))
        .catch(() => {}),
    ];
    if (layout === 'dual') {
      tasks.push(
        fetch(`/api/market/stock/${encodeURIComponent(symbol2)}?timeframe=${encodeURIComponent(timeframe)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => setBars2(d.bars ?? []))
          .catch(() => {})
      );
    }
    if (compareSymbol) {
      tasks.push(
        fetch(`/api/market/stock/${encodeURIComponent(compareSymbol)}?timeframe=${encodeURIComponent(timeframe)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => setCompareBars(d.bars ?? []))
          .catch(() => {})
      );
    }
    await Promise.all(tasks);
  }, autoRefresh, 5000);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/user/charts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const j = await res.json();
        setSavedCharts(j.charts ?? []);
      }
    })();
  }, [user, getIdToken]);

  return (
    <TerminalShell breadcrumb={t.nav.charts}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi' ? 'प्रो चार्टिंग टर्मिनल' : 'Interactive Charting Terminal'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'hi'
                ? 'मल्टी-चार्ट लेआउट, स्टॉक तुलना, तकनीकी ओवरले और ड्राइंग टूल्स।'
                : 'Multi-pane layouts, stock comparison overlay, drawing tools, and saved configurations.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StockPicker
              ariaLabel="Primary chart symbol"
              value={symbol1}
              onChange={setSymbol1}
              includeIndices
              className="w-60"
            />

            <StockPicker
              ariaLabel="Compare overlay stock"
              value={compareSymbol}
              onChange={setCompareSymbol}
              allowEmpty
              emptyLabel={language === 'hi' ? 'तुलना जोड़ें...' : '+ Compare Stock...'}
              className="w-52"
            />

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLayout('single')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  layout === 'single' ? 'bg-blue-600 text-white' : 'text-slate-500'
                }`}
              >
                1 Chart
              </button>
              <button
                type="button"
                onClick={() => setLayout('dual')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  layout === 'dual' ? 'bg-blue-600 text-white' : 'text-slate-500'
                }`}
              >
                2-Pane Split
              </button>
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${layout === 'dual' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
          <TradingChart
            symbol={symbol1}
            bars={bars1}
            compareBars={compareSymbol ? compareBars : []}
            compareSymbol={compareSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            height={520}
          />
          {layout === 'dual' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Pane 2 Symbol</span>
                <StockPicker
                  ariaLabel="Secondary chart symbol"
                  value={symbol2}
                  onChange={setSymbol2}
                  includeIndices
                  className="w-56"
                />
              </div>
              <TradingChart
                symbol={symbol2}
                bars={bars2}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                height={488}
              />
            </div>
          )}
        </div>

        {savedCharts.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
            <h2 className="text-sm font-semibold mb-2">
              {language === 'hi' ? 'सहेजे गए चार्ट लेआउट' : 'Saved Chart Configurations'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {savedCharts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSymbol1(c.symbol);
                    setTimeframe(c.timeframe);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TerminalShell>
  );
}
