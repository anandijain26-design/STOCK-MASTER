'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  IChartApi,
  LineSeries,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import { Maximize2, Minimize2, Save, Trash2 } from 'lucide-react';
import {
  computeBollingerBands,
  computeEMA,
  computeHeikinAshi,
  computeSMA,
  computeSupertrend,
  computeVWAP,
  OHLCVBar,
} from '@/src/lib/indicators';
import { useApp } from './AppProviders';

export type ChartVisualType = 'candlestick' | 'heikin_ashi' | 'line' | 'area' | 'bar';

interface DrawingPoint {
  time: number;
  price: number;
}

export interface ChartDrawingsState {
  hLines: number[];
  trendlines: Array<{ start: DrawingPoint; end: DrawingPoint }>;
}

export interface ExtraPriceLine {
  price: number;
  color: string;
  title: string;
  lineStyle?: number;
}

interface TradingChartProps {
  symbol: string;
  bars: OHLCVBar[];
  compareBars?: OHLCVBar[];
  compareSymbol?: string;
  timeframe: string;
  onTimeframeChange?: (tf: string) => void;
  pivots?: { pp: number | null; r1: number | null; s1: number | null };
  fibonacci?: { r382: number | null; r500: number | null; r618: number | null };
  extraLines?: ExtraPriceLine[];
  height?: number;
}

const TIMEFRAMES = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

export function TradingChart({
  symbol,
  bars,
  compareBars,
  compareSymbol,
  timeframe,
  onTimeframeChange,
  pivots,
  fibonacci,
  extraLines,
  height = 460,
}: TradingChartProps) {
  const { theme, language, user, getIdToken, openAuthModal } = useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [chartType, setChartType] = useState<ChartVisualType>('candlestick');
  const [showSma20, setShowSma20] = useState(false);
  const [showEma20, setShowEma20] = useState(true);
  const [showEma50, setShowEma50] = useState(true);
  const [showEma200, setShowEma200] = useState(false);
  const [showVwap, setShowVwap] = useState(false);
  const [showBb, setShowBb] = useState(false);
  const [showSupertrend, setShowSupertrend] = useState(false);
  const [showPivots, setShowPivots] = useState(false);
  const [showFib, setShowFib] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [drawMode, setDrawMode] = useState<'none' | 'hline' | 'trendline'>('none');
  const [drawings, setDrawings] = useState<ChartDrawingsState>({ hLines: [], trendlines: [] });
  const pendingPointRef = useRef<DrawingPoint | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length === 0) return;

    const isDark = theme === 'dark';
    const chart = createChart(el, {
      width: el.clientWidth,
      height: fullscreen ? window.innerHeight - 180 : height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? '#0B111E' : '#FFFFFF',
        },
        textColor: isDark ? '#94A3B8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(30,41,59,0.55)' : 'rgba(226,232,240,0.8)' },
        horzLines: { color: isDark ? 'rgba(30,41,59,0.55)' : 'rgba(226,232,240,0.8)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: isDark ? '#1E293B' : '#CBD5E1',
      },
      timeScale: {
        borderColor: isDark ? '#1E293B' : '#CBD5E1',
        timeVisible: timeframe !== '1D' && timeframe !== '1W' && timeframe !== '1M',
      },
    });

    chartRef.current = chart;

    const sourceBars = chartType === 'heikin_ashi' ? computeHeikinAshi(bars) : bars;
    const dedupMap = new Map<number, OHLCVBar>();
    for (const b of sourceBars) {
      dedupMap.set(b.time, b);
    }
    const cleanBars = Array.from(dedupMap.values()).sort((a, b) => a.time - b.time);

    let mainSeries: ReturnType<IChartApi['addSeries']>;

    if (chartType === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 2,
      });
      mainSeries.setData(
        cleanBars.map((b) => ({ time: b.time as UTCTimestamp, value: b.close }))
      );
    } else if (chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#3B82F6',
        topColor: 'rgba(59, 130, 246, 0.35)',
        bottomColor: 'rgba(59, 130, 246, 0.02)',
        lineWidth: 2,
      });
      mainSeries.setData(
        cleanBars.map((b) => ({ time: b.time as UTCTimestamp, value: b.close }))
      );
    } else if (chartType === 'bar') {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
      });
      mainSeries.setData(
        cleanBars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))
      );
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      mainSeries.setData(
        cleanBars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))
      );
    }

    const closes = cleanBars.map((b) => b.close);
    const addLineOverlay = (
      values: (number | null)[],
      color: string,
      title: string,
      lineWidth: 1 | 2 = 1
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        title,
        priceLineVisible: false,
      });
      const data = cleanBars
        .map((b, i) => (values[i] !== null ? { time: b.time as UTCTimestamp, value: values[i]! } : null))
        .filter((d): d is { time: UTCTimestamp; value: number } => d !== null);
      if (data.length > 0) series.setData(data);
    };

    if (showSma20) addLineOverlay(computeSMA(closes, 20), '#F59E0B', 'SMA 20');
    if (showEma20) addLineOverlay(computeEMA(closes, 20), '#38BDF8', 'EMA 20');
    if (showEma50) addLineOverlay(computeEMA(closes, 50), '#A855F7', 'EMA 50');
    if (showEma200) addLineOverlay(computeEMA(closes, 200), '#F97316', 'EMA 200', 2);
    if (showVwap) addLineOverlay(computeVWAP(cleanBars), '#EC4899', 'VWAP');
    if (showBb) {
      const bb = computeBollingerBands(closes, 20, 2);
      addLineOverlay(bb.upper, 'rgba(148,163,184,0.65)', 'BB Upper');
      addLineOverlay(bb.lower, 'rgba(148,163,184,0.65)', 'BB Lower');
    }
    if (showSupertrend) {
      const st = computeSupertrend(cleanBars, 10, 3);
      addLineOverlay(
        st.map((x) => x.value),
        '#14B8A6',
        'Supertrend',
        2
      );
    }

    if (compareBars && compareBars.length > 0 && compareSymbol) {
      const baseMain = cleanBars[0]?.close || 1;
      const baseComp = compareBars[0]?.close || 1;
      const ratio = baseMain / baseComp;
      const compMap = new Map<number, number>();
      for (const cb of compareBars) compMap.set(cb.time, cb.close * ratio);
      const compSeries = chart.addSeries(LineSeries, {
        color: '#FACC15',
        lineWidth: 2,
        title: `${compareSymbol} (Scaled)`,
      });
      const cData = Array.from(compMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
      if (cData.length > 0) compSeries.setData(cData);
    }

    if (showPivots && pivots) {
      if (pivots.r1) mainSeries.createPriceLine({ price: pivots.r1, color: '#EF4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'R1' });
      if (pivots.pp) mainSeries.createPriceLine({ price: pivots.pp, color: '#94A3B8', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'PP' });
      if (pivots.s1) mainSeries.createPriceLine({ price: pivots.s1, color: '#10B981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'S1' });
    }
    if (showFib && fibonacci) {
      if (fibonacci.r382) mainSeries.createPriceLine({ price: fibonacci.r382, color: '#F59E0B', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: 'Fib 38.2%' });
      if (fibonacci.r500) mainSeries.createPriceLine({ price: fibonacci.r500, color: '#F59E0B', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: 'Fib 50%' });
      if (fibonacci.r618) mainSeries.createPriceLine({ price: fibonacci.r618, color: '#F59E0B', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: 'Fib 61.8%' });
    }

    if (extraLines && extraLines.length > 0) {
      for (const line of extraLines) {
        if (line.price > 0) {
          mainSeries.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 2,
            lineStyle: line.lineStyle ?? 2,
            axisLabelVisible: true,
            title: line.title,
          });
        }
      }
    }

    for (const hPrice of drawings.hLines) {
      mainSeries.createPriceLine({
        price: hPrice,
        color: '#3B82F6',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'Line',
      });
    }

    for (const tl of drawings.trendlines) {
      const tlSeries = chart.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const pts = [tl.start, tl.end].sort((a, b) => a.time - b.time);
      if (pts[0].time !== pts[1].time) {
        tlSeries.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.price })));
      }
    }

    chart.subscribeClick((param) => {
      if (drawMode === 'none' || !param.point || !param.time) return;
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price === null) return;
      const clickedTime = Number(param.time as Time);

      if (drawMode === 'hline') {
        setDrawings((prev) => ({
          ...prev,
          hLines: [...prev.hLines, Math.round(price * 100) / 100],
        }));
        setDrawMode('none');
      } else if (drawMode === 'trendline') {
        const pt = { time: clickedTime, price: Math.round(price * 100) / 100 };
        if (!pendingPointRef.current) {
          pendingPointRef.current = pt;
        } else {
          const start = pendingPointRef.current;
          pendingPointRef.current = null;
          setDrawings((prev) => ({
            ...prev,
            trendlines: [...prev.trendlines, { start, end: pt }],
          }));
          setDrawMode('none');
        }
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: fullscreen ? window.innerHeight - 180 : height,
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [
    bars,
    compareBars,
    compareSymbol,
    chartType,
    theme,
    timeframe,
    fullscreen,
    height,
    showSma20,
    showEma20,
    showEma50,
    showEma200,
    showVwap,
    showBb,
    showSupertrend,
    showPivots,
    showFib,
    pivots,
    fibonacci,
    extraLines,
    drawings,
    drawMode,
  ]);

  const handleSaveLayout = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/user/charts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        symbol,
        title: `${symbol} · ${timeframe} (${chartType})`,
        chartType,
        timeframe,
        indicators: {
          sma20: showSma20,
          ema20: showEma20,
          ema50: showEma50,
          ema200: showEma200,
          vwap: showVwap,
          bb: showBb,
          supertrend: showSupertrend,
          pivots: showPivots,
          fib: showFib,
        },
        drawings: [drawings],
      }),
    });
    if (res.ok) {
      setSaveMessage(language === 'hi' ? 'चार्ट लेआउट सहेजा गया' : 'Chart layout saved');
      setTimeout(() => setSaveMessage(null), 2500);
    }
  };

  return (
    <div
      className={`${
        fullscreen
          ? 'fixed inset-0 z-50 bg-white dark:bg-[#080D1A] p-4 flex flex-col'
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden'
      }`}
    >
      {/* Crisp Two-Row Chart Toolbar (Zero awkward orphan buttons) */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B111E] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Timeframes */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Types + Drawing + Save Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2">
              {(
                [
                  ['candlestick', language === 'hi' ? 'कैंडलस्टिक' : 'Candles'],
                  ['heikin_ashi', 'Heikin Ashi'],
                  ['line', language === 'hi' ? 'लाइन' : 'Line'],
                  ['area', language === 'hi' ? 'एरिया' : 'Area'],
                  ['bar', language === 'hi' ? 'बार' : 'Bars'],
                ] as Array<[ChartVisualType, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChartType(id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                    chartType === id
                      ? 'bg-slate-900 dark:bg-slate-700 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                pendingPointRef.current = null;
                setDrawMode(drawMode === 'hline' ? 'none' : 'hline');
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                drawMode === 'hline'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {language === 'hi' ? 'हॉरिज़ॉन्टल लाइन' : 'H-Line'}
            </button>
            <button
              type="button"
              onClick={() => {
                pendingPointRef.current = null;
                setDrawMode(drawMode === 'trendline' ? 'none' : 'trendline');
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                drawMode === 'trendline'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {language === 'hi' ? 'ट्रेंडलाइन' : 'Trendline'}
            </button>
            {(drawings.hLines.length > 0 || drawings.trendlines.length > 0) && (
              <button
                type="button"
                onClick={() => setDrawings({ hLines: [], trendlines: [] })}
                aria-label="Clear chart drawings"
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveLayout}
              className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Save className="w-3 h-3" />
              <span>{language === 'hi' ? 'सहेजें' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen chart'}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Indicator Overlay Strip (Single-row aligned on desktop) */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 mr-1">
          {language === 'hi' ? 'संकेतक:' : 'Overlays:'}
        </span>
        {[
          { label: 'SMA 20', active: showSma20, toggle: () => setShowSma20((v) => !v) },
          { label: 'EMA 20', active: showEma20, toggle: () => setShowEma20((v) => !v) },
          { label: 'EMA 50', active: showEma50, toggle: () => setShowEma50((v) => !v) },
          { label: 'EMA 200', active: showEma200, toggle: () => setShowEma200((v) => !v) },
          { label: 'VWAP', active: showVwap, toggle: () => setShowVwap((v) => !v) },
          { label: 'BB (20,2)', active: showBb, toggle: () => setShowBb((v) => !v) },
          { label: 'Supertrend', active: showSupertrend, toggle: () => setShowSupertrend((v) => !v) },
          { label: 'Pivots', active: showPivots, toggle: () => setShowPivots((v) => !v) },
          { label: 'Fibonacci', active: showFib, toggle: () => setShowFib((v) => !v) },
        ].map((ind) => (
          <button
            key={ind.label}
            type="button"
            onClick={ind.toggle}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
              ind.active
                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {ind.label}
          </button>
        ))}

        {drawMode !== 'none' && (
          <span className="ml-auto text-blue-500 font-medium">
            {drawMode === 'hline'
              ? language === 'hi'
                ? 'चार्ट पर क्लिक करके लाइन रखें'
                : 'Click chart to place horizontal line'
              : language === 'hi'
                ? 'ट्रेंडलाइन के लिए 2 बिंदु क्लिक करें'
                : 'Click 2 points on chart for trendline'}
          </span>
        )}
        {saveMessage && (
          <span className="ml-auto text-emerald-500 font-medium">{saveMessage}</span>
        )}
      </div>

      {/* Lightweight Charts Canvas */}
      <div
        ref={containerRef}
        data-testid="tradingview-chart-canvas"
        className="w-full"
        style={{ minHeight: fullscreen ? 'calc(100vh - 180px)' : `${height}px` }}
      />
    </div>
  );
}
