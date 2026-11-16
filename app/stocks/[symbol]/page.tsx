'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BellPlus, Bot, CandlestickChart, Star } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { PriceChange } from '@/src/components/PriceChange';
import { TradingChart } from '@/src/components/TradingChart';
import { MarkdownProse } from '@/src/components/MarkdownProse';
import { formatIndianNumber, formatINR } from '@/src/lib/i18n';
import { OHLCVBar, TechnicalSummary } from '@/src/lib/indicators';
import { LiveQuote } from '@/src/lib/market-data';
import { StockMasterItem } from '@/src/lib/nse-universe';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface StockDetailPayload {
  master: StockMasterItem;
  quote: LiveQuote;
  bars: OHLCVBar[];
  technicals: TechnicalSummary | null;
  derivedFundamentals: {
    eps: number | null;
    bookValue: number | null;
    peRatio: number | null;
    pbRatio: number | null;
    roe: number | null;
    roce: number | null;
    debtToEquity: number | null;
    dividendYield: number | null;
    faceValue: number;
    profitGrowth: number | null;
    shareholding: {
      promoter: number | null;
      fii: number | null;
      dii: number | null;
      public: number | null;
    };
    note: string;
  };
  relatedNews: Array<{
    id: string;
    title: string;
    link: string;
    source: string;
    publishedAt: string;
    summary: string;
  }>;
}

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params?.symbol ?? 'RELIANCE').toUpperCase();
  const { t, language, user, getIdToken, openAuthModal, autoRefresh } = useApp();

  const [detail, setDetail] = useState<StockDetailPayload | null>(null);
  const [timeframe, setTimeframe] = useState('1D');
  const [activeTab, setActiveTab] = useState<'overview' | 'technicals' | 'fundamentals' | 'news' | 'ai'>('overview');
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const loadStock = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/market/stock/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        setDetail(json);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [symbol, timeframe]);

  useAutoRefresh(() => loadStock(true), autoRefresh, 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadStock();
    });
    return () => {
      active = false;
    };
  }, [loadStock]);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  const handleAddToWatchlist = async () => {
    if (!user) return openAuthModal();
    const token = await getIdToken();
    if (!token) return;
    const listRes = await fetch('/api/user/watchlists', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok) {
      const { watchlists } = await listRes.json();
      const target = watchlists?.[0];
      if (target) {
        await fetch('/api/user/watchlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'addSymbol', watchlistId: target.id, symbol }),
        });
        showToast(`${symbol} added to ${target.name}`);
      }
    }
  };

  const handleCreatePriceAlert = async () => {
    if (!user) return openAuthModal();
    if (!detail?.quote.price) return;
    const token = await getIdToken();
    if (!token) return;
    const target = Math.round(detail.quote.price * 1.03 * 100) / 100;
    const res = await fetch('/api/user/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        symbol,
        alertType: 'TARGET_PRICE',
        conditionLabel: `Price crosses above ₹${target}`,
        thresholdValue: target,
        channels: ['in_app', 'browser'],
      }),
    });
    if (res.ok) showToast(`Target alert set at ₹${target}`);
  };

  const handleRunAi = async () => {
    setActiveTab('ai');
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          language,
          query: `Provide a comprehensive technical, fundamental, volume, support/resistance, and risk analysis for ${symbol}.`,
        }),
      });
      const json = await res.json();
      setAiReport(json.analysis ?? json.error ?? 'Unable to generate analysis.');
    } finally {
      setAiBusy(false);
    }
  };

  const tech = detail?.technicals;
  const fund = detail?.derivedFundamentals;
  const quote = detail?.quote;

  return (
    <TerminalShell breadcrumb={`${t.nav.stocks} / ${symbol}`}>
      <div className="space-y-6">
        {/* Top Stock Header */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{detail?.master.exchange ?? 'NSE'}</span>
                <span aria-hidden="true">·</span>
                <span>BSE {detail?.master.bseCode ?? '—'}</span>
                <span aria-hidden="true">·</span>
                <span>{detail?.master.sector ?? 'Equities'}</span>
                <span aria-hidden="true">·</span>
                <span>{detail?.master.marketCapCategory ?? 'Listed'}</span>
                {detail?.master.isFno && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-blue-500 font-medium">NSE F&O</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {detail?.master.companyName ?? symbol}{' '}
                <span className="font-mono text-lg text-slate-500">({symbol})</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-baseline gap-4">
                <span className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
                  {quote?.price !== null && quote?.price !== undefined ? formatINR(quote.price) : loading ? '...' : t.common.unavailable}
                </span>
                <span className="text-sm">
                  <PriceChange change={quote?.change} changePercent={quote?.changePercent} showCurrency />
                </span>
                {quote?.timestamp && (
                  <span className="text-xs font-mono text-slate-500">
                    {quote.isDelayed ? t.common.delayed : t.common.live} · {new Date(quote.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddToWatchlist}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Star className="w-3.5 h-3.5" />
                <span>{t.stockDetail.addToWatchlist}</span>
              </button>
              <button
                type="button"
                onClick={handleCreatePriceAlert}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <BellPlus className="w-3.5 h-3.5" />
                <span>{t.stockDetail.setAlert}</span>
              </button>
              <Link
                href={`/paper-trading?symbol=${encodeURIComponent(symbol)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <CandlestickChart className="w-3.5 h-3.5" />
                <span>{t.stockDetail.paperTradeBtn}</span>
              </Link>
              <button
                type="button"
                onClick={handleRunAi}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{t.stockDetail.runAiAnalysis}</span>
              </button>
            </div>
          </div>

          {actionToast && (
            <div className="mt-3 text-xs text-emerald-500 font-medium">{actionToast}</div>
          )}

          {/* Key Market Stats Row */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Day Low / High</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {quote?.dayLow && quote?.dayHigh
                  ? `${formatINR(quote.dayLow)} – ${formatINR(quote.dayHigh)}`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">{t.stockDetail.highLow52W}</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {quote?.fiftyTwoWeekLow && quote?.fiftyTwoWeekHigh
                  ? `${formatINR(quote.fiftyTwoWeekLow)} – ${formatINR(quote.fiftyTwoWeekHigh)}`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">{t.common.volume}</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {formatIndianNumber(quote?.volume)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">{t.stockDetail.peRatio}</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {fund?.peRatio ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">{t.stockDetail.roe}</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {fund?.roe !== null && fund?.roe !== undefined ? `${fund.roe}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">RSI (14) · Supertrend</div>
              <div className="font-mono tabular-nums font-medium mt-0.5">
                {tech?.rsi14 ?? '—'} · {tech?.supertrend.trend ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 w-fit">
          {(
            [
              ['overview', t.stockDetail.overview],
              ['technicals', t.stockDetail.technicals],
              ['fundamentals', t.stockDetail.fundamentals],
              ['news', t.stockDetail.newsAndCorp],
              ['ai', t.stockDetail.aiAnalysis],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Interactive Chart & Price Action */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {detail && detail.bars.length > 0 ? (
              <TradingChart
                symbol={symbol}
                bars={detail.bars}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                pivots={tech?.pivots}
                fibonacci={tech?.fibonacci}
                height={480}
              />
            ) : (
              <div className="h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center justify-center text-sm text-slate-500">
                {loading ? t.common.loading : t.common.unavailable}
              </div>
            )}

            {/* Quick Support, Resistance & Patterns Strip */}
            {tech && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold text-slate-500 mb-2">
                    {language === 'hi' ? 'सपोर्ट स्तर (Support)' : 'Detected Support Levels'}
                  </h3>
                  <div className="font-mono tabular-nums text-sm space-y-1">
                    {tech.supportLevels.map((lvl, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-500">S{idx + 1}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatINR(lvl)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold text-slate-500 mb-2">
                    {language === 'hi' ? 'रेज़िस्टेंस स्तर (Resistance)' : 'Detected Resistance Levels'}
                  </h3>
                  <div className="font-mono tabular-nums text-sm space-y-1">
                    {tech.resistanceLevels.map((lvl, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-500">R{idx + 1}</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {formatINR(lvl)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold text-slate-500 mb-2">
                    {language === 'hi' ? 'प्राइस एक्शन व पैटर्न' : 'Price Action & Patterns'}
                  </h3>
                  <div className="text-xs space-y-1.5">
                    <div>
                      Structure: <span className="font-mono font-medium">{tech.structure.trendStructure}</span>
                    </div>
                    <div>
                      Breakout: <span className="font-mono font-medium">{tech.structure.breakout}</span> · Gap: <span className="font-mono font-medium">{tech.structure.gapType}</span>
                    </div>
                    <div>
                      Candles:{' '}
                      <span className="font-medium">
                        {tech.patterns.length > 0 ? tech.patterns.join(', ') : 'No reversal candle today'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Complete Technical Analysis Toolkit */}
        {activeTab === 'technicals' && tech && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Trend */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                {language === 'hi' ? 'ट्रेंड संकेतक (Trend)' : 'Trend Indicators'}
              </h2>
              {[
                ['SMA 20 / 50 / 200', `${tech.sma20 ?? '—'} / ${tech.sma50 ?? '—'} / ${tech.sma200 ?? '—'}`],
                ['EMA 20 / 50 / 200', `${tech.ema20 ?? '—'} / ${tech.ema50 ?? '—'} / ${tech.ema200 ?? '—'}`],
                ['DEMA (20)', tech.dema20 ?? '—'],
                ['TEMA (20)', tech.tema20 ?? '—'],
                ['VWAP', tech.vwap ?? '—'],
                ['Supertrend (10,3)', `${tech.supertrend.value ?? '—'} (${tech.supertrend.trend})`],
                ['Ichimoku Tenkan/Kijun', `${tech.ichimoku.tenkan ?? '—'} / ${tech.ichimoku.kijun ?? '—'}`],
                ['Parabolic SAR', tech.psar ?? '—'],
                ['ADX (14)', tech.adx ?? '—'],
                ['MACD / Signal', `${tech.macd.macd ?? '—'} / ${tech.macd.signal ?? '—'} (${tech.macd.crossover})`],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono tabular-nums font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Momentum */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                {language === 'hi' ? 'मोमेंटम संकेतक (Momentum)' : 'Momentum Indicators'}
              </h2>
              {[
                ['RSI (14)', tech.rsi14 ?? '—'],
                ['Stochastic RSI %K', tech.stochRsi.k ?? '—'],
                ['Stochastic (%K / %D)', `${tech.stochastic.k ?? '—'} / ${tech.stochastic.d ?? '—'}`],
                ['CCI (20)', tech.cci20 ?? '—'],
                ['ROC (12)', tech.roc12 !== null ? `${tech.roc12}%` : '—'],
                ['Williams %R (14)', tech.williamsR14 ?? '—'],
                ['Momentum (10)', tech.momentum10 ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono tabular-nums font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Volatility */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                {language === 'hi' ? 'वोलैटिलिटी (Volatility)' : 'Volatility & Channels'}
              </h2>
              {[
                ['Bollinger Upper', tech.bollinger.upper ?? '—'],
                ['Bollinger Mid', tech.bollinger.middle ?? '—'],
                ['Bollinger Lower', tech.bollinger.lower ?? '—'],
                ['ATR (14)', tech.atr14 ?? '—'],
                ['Keltner Upper/Lower', `${tech.keltner.upper ?? '—'} / ${tech.keltner.lower ?? '—'}`],
                ['Donchian (20) H/L', `${tech.donchian.upper ?? '—'} / ${tech.donchian.lower ?? '—'}`],
                ['Std Deviation (20)', tech.stdDev20 ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono tabular-nums font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Volume & Pivots */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                {language === 'hi' ? 'वॉल्यूम व पिवट स्तर' : 'Volume, Pivots & Fibonacci'}
              </h2>
              {[
                ['OBV', formatIndianNumber(tech.obv)],
                ['MFI (14)', tech.mfi14 ?? '—'],
                ['Chaikin Money Flow (20)', tech.cmf20 ?? '—'],
                ['Relative Volume', tech.relativeVolume !== null ? `${tech.relativeVolume}x` : '—'],
                ['Pivot Point (PP)', tech.pivots.pp ?? '—'],
                ['R1 / R2 / R3', `${tech.pivots.r1 ?? '—'} / ${tech.pivots.r2 ?? '—'} / ${tech.pivots.r3 ?? '—'}`],
                ['S1 / S2 / S3', `${tech.pivots.s1 ?? '—'} / ${tech.pivots.s2 ?? '—'} / ${tech.pivots.s3 ?? '—'}`],
                ['Fib 38.2% / 50% / 61.8%', `${tech.fibonacci.r382 ?? '—'} / ${tech.fibonacci.r500 ?? '—'} / ${tech.fibonacci.r618 ?? '—'}`],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-mono tabular-nums font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Fundamentals & Shareholding */}
        {activeTab === 'fundamentals' && fund && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5">
              <h2 className="text-base font-semibold mb-4">{t.stockDetail.fundamentals}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  [t.stockDetail.peRatio, fund.peRatio ?? '—'],
                  [t.stockDetail.pbRatio, fund.pbRatio ?? '—'],
                  [t.stockDetail.eps, fund.eps !== null ? formatINR(fund.eps) : '—'],
                  [t.stockDetail.bookValue, fund.bookValue !== null ? formatINR(fund.bookValue) : '—'],
                  [t.stockDetail.roe, fund.roe !== null ? `${fund.roe}%` : '—'],
                  [t.stockDetail.roce, fund.roce !== null ? `${fund.roce}%` : '—'],
                  [t.stockDetail.debtToEquity, fund.debtToEquity ?? '—'],
                  [t.stockDetail.dividendYield, fund.dividendYield !== null ? `${fund.dividendYield}%` : '—'],
                  [t.stockDetail.faceValue, `₹${fund.faceValue}`],
                ].map(([label, val]) => (
                  <div key={String(label)} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="font-mono tabular-nums text-base font-semibold mt-1">{val}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">{fund.note}</p>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
              <h2 className="text-base font-semibold">{t.stockDetail.shareholding}</h2>
              {[
                [t.stockDetail.promoterHolding, fund.shareholding.promoter, 'bg-blue-500'],
                [t.stockDetail.fiiHolding, fund.shareholding.fii, 'bg-emerald-500'],
                [t.stockDetail.diiHolding, fund.shareholding.dii, 'bg-amber-500'],
                [t.stockDetail.publicHolding, fund.shareholding.public, 'bg-slate-400'],
              ].map(([label, pct, barColor]) => (
                <div key={String(label)} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="font-mono tabular-nums font-medium">
                      {pct !== null ? `${pct}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${typeof pct === 'number' ? pct : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                ISIN: <span className="font-mono">{detail?.master.isin}</span> · Industry: {detail?.master.industry}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: News & Corporate Announcements */}
        {activeTab === 'news' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] divide-y divide-slate-100 dark:divide-slate-800">
            {(detail?.relatedNews ?? []).map((n) => (
              <div key={n.id} className="p-4 flex flex-col gap-1">
                <div className="text-xs text-slate-500">
                  {n.source} · {new Date(n.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </div>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-500"
                >
                  {n.title}
                </a>
                {n.summary && <p className="text-xs text-slate-600 dark:text-slate-400">{n.summary}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: AI Research Brief */}
        {activeTab === 'ai' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.stockDetail.aiAnalysis} ({symbol})</h2>
              <button
                type="button"
                onClick={handleRunAi}
                disabled={aiBusy}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-60"
              >
                {aiBusy ? t.common.loading : t.stockDetail.runAiAnalysis}
              </button>
            </div>
            {aiReport ? (
              <MarkdownProse content={aiReport} />
            ) : (
              <p className="text-sm text-slate-500">
                {language === 'hi'
                  ? 'लाइव कीमत और तकनीकी संकेतकों पर आधारित AI शोध रिपोर्ट के लिए ऊपर दिए गए बटन पर क्लिक करें।'
                  : 'Click "Generate AI Stock Research" above to synthesize live price action, technical indicators, fundamentals, and risk factors.'}
              </p>
            )}
            <p className="text-xs text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800">
              {t.aiAnalyst.disclaimer}
            </p>
          </div>
        )}
      </div>
    </TerminalShell>
  );
}
