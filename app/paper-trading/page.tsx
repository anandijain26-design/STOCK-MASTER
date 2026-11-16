'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Pause, Play, RefreshCw, RotateCcw, SkipForward } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { StockPicker } from '@/src/components/StockPicker';
import { ExtraPriceLine, TradingChart } from '@/src/components/TradingChart';
import { formatINR } from '@/src/lib/i18n';
import { findStockMaster } from '@/src/lib/nse-universe';
import { OHLCVBar } from '@/src/lib/indicators';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import {
  calculateCharges,
  calculateRequiredMargin,
  computeNextSimTick,
  computePaperAnalytics,
  evaluateBracketExit,
  ProductType,
  shouldExecutePendingOrder,
  SimOrderType,
} from '@/src/lib/paper-sim';

interface VirtualPosition {
  symbol: string;
  companyName: string;
  quantity: number;
  avgPrice: number;
  ltp: number | null;
  invested: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  stopLoss?: number | null;
  target?: number | null;
  productType?: ProductType;
}

interface PendingSimOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'SL';
  productType: ProductType;
  quantity: number;
  triggerPrice: number;
  stopLoss?: number | null;
  target?: number | null;
  createdAt: string;
}

interface VirtualTrade {
  id: number | string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: string;
  quantity: number;
  executedPrice: number | string;
  totalValue: number | string;
  realizedPnl: number | string;
  priceSource: string;
  executedAt: string;
}

interface LocalPaperState {
  initialCapital: number;
  cashBalance: number;
  realizedPnl: number;
  positions: Array<{
    symbol: string;
    companyName: string;
    quantity: number;
    avgPrice: number;
    stopLoss?: number | null;
    target?: number | null;
    productType?: ProductType;
  }>;
  pendingOrders?: PendingSimOrder[];
  trades: VirtualTrade[];
}

const LOCAL_KEY = 'stock_mastery_paper_sandbox_v2';

function PaperTradingInner() {
  const searchParams = useSearchParams();
  const initialSymbol = (searchParams.get('symbol') ?? 'RELIANCE').toUpperCase();
  const { t, language, user, getIdToken, openAuthModal, autoRefresh } = useApp();

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState('1D');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [atrValue, setAtrValue] = useState<number | null>(null);
  const [chartBars, setChartBars] = useState<OHLCVBar[]>([]);
  const [priceTimestamp, setPriceTimestamp] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState('Yahoo Finance NSE Feed');

  // Demo Simulation Replay Engine State (24/7 works even when NSE is closed)
  const [simMode, setSimMode] = useState<'LIVE' | 'TICK_REPLAY'>('LIVE');
  const [simPlaying, setSimPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5 | 10>(1);
  const [simStep, setSimStep] = useState(0);
  const [simPrice, setSimPrice] = useState<number | null>(null);

  // Order Ticket State
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [productType, setProductType] = useState<ProductType>('CNC');
  const [orderType, setOrderType] = useState<SimOrderType>('MARKET');
  const [quantity, setQuantity] = useState(10);
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLossInput, setStopLossInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [resetCapChoice, setResetCapChoice] = useState(100000);
  const [activeTab, setActiveTab] = useState<'positions' | 'pending' | 'history'>('positions');

  const [account, setAccount] = useState({
    initialCapital: 100000,
    cashBalance: 100000,
    realizedPnl: 0,
    investedValue: 0,
    holdingsMarketValue: 0,
    totalNetWorth: 100000,
    unrealizedPnl: 0,
  });
  const [positions, setPositions] = useState<VirtualPosition[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingSimOrder[]>([]);
  const [bracketsMap, setBracketsMap] = useState<Record<string, { sl?: number | null; target?: number | null }>>({});
  const [trades, setTrades] = useState<VirtualTrade[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const activeMarketPrice = simMode === 'TICK_REPLAY' && simPrice !== null ? simPrice : livePrice;

  const loadLocalGuestState = useCallback(async () => {
    let parsed: LocalPaperState = {
      initialCapital: 100000,
      cashBalance: 100000,
      realizedPnl: 0,
      positions: [],
      pendingOrders: [],
      trades: [],
    };
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY) ?? window.localStorage.getItem('stock_mastery_paper_sandbox_v1');
      if (raw) parsed = JSON.parse(raw);
    } catch {
      // default
    }

    const enriched: VirtualPosition[] = await Promise.all(
      parsed.positions.map(async (p) => {
        let ltp: number | null = p.avgPrice;
        if (p.symbol === selectedSymbol && activeMarketPrice !== null) {
          ltp = activeMarketPrice;
        } else {
          try {
            const r = await fetch(`/api/market/stock/${encodeURIComponent(p.symbol)}`);
            if (r.ok) {
              const j = await r.json();
              if (j.quote?.price) ltp = j.quote.price;
            }
          } catch {
            // keep avg
          }
        }
        const invested = p.quantity * p.avgPrice;
        const currentValue = (ltp ?? p.avgPrice) * p.quantity;
        const unrealizedPnl = currentValue - invested;
        return {
          ...p,
          ltp,
          invested: Math.round(invested * 100) / 100,
          currentValue: Math.round(currentValue * 100) / 100,
          unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
          unrealizedPct: invested > 0 ? Math.round((unrealizedPnl / invested) * 10000) / 100 : 0,
        };
      })
    );

    const investedValue = enriched.reduce((a, b) => a + b.invested, 0);
    const holdingsMarketValue = enriched.reduce((a, b) => a + b.currentValue, 0);
    setPositions(enriched);
    setPendingOrders(parsed.pendingOrders ?? []);
    setTrades(parsed.trades ?? []);
    setAccount({
      initialCapital: parsed.initialCapital,
      cashBalance: parsed.cashBalance,
      realizedPnl: parsed.realizedPnl,
      investedValue: Math.round(investedValue * 100) / 100,
      holdingsMarketValue: Math.round(holdingsMarketValue * 100) / 100,
      totalNetWorth: Math.round((parsed.cashBalance + holdingsMarketValue) * 100) / 100,
      unrealizedPnl: Math.round((holdingsMarketValue - investedValue) * 100) / 100,
    });
  }, [selectedSymbol, activeMarketPrice]);

  const loadAccount = useCallback(async () => {
    if (!user) {
      await loadLocalGuestState();
      return;
    }
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/paper-trading', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const cloudPositions: VirtualPosition[] = (json.positions ?? []).map((p: VirtualPosition) => {
        const bracket = bracketsMap[p.symbol];
        const effectiveLtp =
          p.symbol === selectedSymbol && simMode === 'TICK_REPLAY' && simPrice !== null
            ? simPrice
            : p.ltp;
        const currentValue = (effectiveLtp ?? p.avgPrice) * p.quantity;
        const unrealizedPnl = currentValue - p.invested;
        return {
          ...p,
          ltp: effectiveLtp,
          currentValue: Math.round(currentValue * 100) / 100,
          unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
          unrealizedPct: p.invested > 0 ? Math.round((unrealizedPnl / p.invested) * 10000) / 100 : 0,
          stopLoss: bracket?.sl ?? null,
          target: bracket?.target ?? null,
        };
      });
      setAccount(json.account);
      setPositions(cloudPositions);
      setTrades(json.trades ?? []);
    }
  }, [user, getIdToken, loadLocalGuestState, bracketsMap, selectedSymbol, simMode, simPrice]);

  const loadSelectedQuote = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/market/stock/${encodeURIComponent(selectedSymbol)}?timeframe=${encodeURIComponent(timeframe)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        const px = json.quote?.price ?? null;
        setLivePrice(px);
        setAtrValue(json.technicals?.atr14 ?? null);
        setChartBars(json.bars ?? []);
        setPriceTimestamp(json.quote?.timestamp ?? null);
        setPriceSource(json.quote?.source ?? 'Yahoo Finance NSE Feed');
        setSimPrice((prev) => (simMode === 'TICK_REPLAY' && prev !== null ? prev : px));
      }
    } catch {
      setLivePrice(null);
    }
  }, [selectedSymbol, timeframe, simMode]);

  useAutoRefresh(
    async () => {
      if (simMode === 'LIVE') {
        await Promise.all([loadSelectedQuote(), loadAccount()]);
      }
    },
    autoRefresh && simMode === 'LIVE',
    5000
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadAccount();
    });
    return () => {
      active = false;
    };
  }, [loadAccount]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setSimPlaying(false);
      setSimStep(0);
      setSimPrice(null);
      void loadSelectedQuote();
    });
    return () => {
      active = false;
    };
  }, [selectedSymbol, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const executeOrderInternal = useCallback(
    async (params: {
      sym: string;
      orderSide: 'BUY' | 'SELL';
      type: SimOrderType;
      qty: number;
      execPrice: number;
      sl?: number | null;
      tgt?: number | null;
      reasonNote?: string;
    }) => {
      const { sym, orderSide, type, qty, execPrice, sl, tgt, reasonNote } = params;

      if (user) {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/paper-trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            symbol: sym,
            side: orderSide,
            orderType: type,
            quantity: qty,
            limitPrice: execPrice,
            isSimulatedTick: simMode === 'TICK_REPLAY',
            simulatedPrice: execPrice,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setFeedback({ type: 'err', text: json.error ?? 'Order failed.' });
          return;
        }
        if (orderSide === 'BUY' && (sl || tgt)) {
          setBracketsMap((prev) => ({ ...prev, [sym]: { sl, target: tgt } }));
        } else if (orderSide === 'SELL') {
          setBracketsMap((prev) => {
            const copy = { ...prev };
            delete copy[sym];
            return copy;
          });
        }
        setFeedback({
          type: 'ok',
          text: `${reasonNote ? `${reasonNote}: ` : ''}Virtual ${orderSide} executed: ${qty} × ${sym} @ ${formatINR(Number(json.trade.executedPrice))}`,
        });
        await loadAccount();
        return;
      }

      // Guest sandbox persistence
      const total = Math.round(execPrice * qty * 100) / 100;
      const charges = calculateCharges({ side: orderSide, productType, orderValue: total }).totalCharges;
      const raw = window.localStorage.getItem(LOCAL_KEY) ?? window.localStorage.getItem('stock_mastery_paper_sandbox_v1');
      const state: LocalPaperState = raw
        ? JSON.parse(raw)
        : { initialCapital: 100000, cashBalance: 100000, realizedPnl: 0, positions: [], pendingOrders: [], trades: [] };

      let realizedDelta = 0;
      const posIdx = state.positions.findIndex((p) => p.symbol === sym);
      const master = findStockMaster(sym);

      if (orderSide === 'BUY') {
        if (total + charges > state.cashBalance) {
          setFeedback({
            type: 'err',
            text: `Insufficient virtual cash (requires ${formatINR(total + charges)}, available ${formatINR(state.cashBalance)}).`,
          });
          return;
        }
        state.cashBalance = Math.round((state.cashBalance - total - charges) * 100) / 100;
        if (posIdx >= 0) {
          const p = state.positions[posIdx];
          const newQty = p.quantity + qty;
          p.avgPrice = Math.round(((p.quantity * p.avgPrice + total) / newQty) * 100) / 100;
          p.quantity = newQty;
          if (sl) p.stopLoss = sl;
          if (tgt) p.target = tgt;
        } else {
          state.positions.push({
            symbol: sym,
            companyName: master?.companyName ?? sym,
            quantity: qty,
            avgPrice: execPrice,
            stopLoss: sl ?? null,
            target: tgt ?? null,
            productType,
          });
        }
      } else {
        if (posIdx < 0 || state.positions[posIdx].quantity < qty) {
          setFeedback({ type: 'err', text: `Insufficient virtual shares of ${sym}.` });
          return;
        }
        const p = state.positions[posIdx];
        realizedDelta = Math.round(((execPrice - p.avgPrice) * qty - charges) * 100) / 100;
        state.realizedPnl = Math.round((state.realizedPnl + realizedDelta) * 100) / 100;
        state.cashBalance = Math.round((state.cashBalance + total - charges) * 100) / 100;
        p.quantity -= qty;
        if (p.quantity <= 0) state.positions.splice(posIdx, 1);
      }

      state.trades.unshift({
        id: Date.now() + Math.random(),
        symbol: sym,
        side: orderSide,
        orderType: type,
        quantity: qty,
        executedPrice: execPrice,
        totalValue: total,
        realizedPnl: realizedDelta,
        priceSource: simMode === 'TICK_REPLAY' ? 'Demo Tick Simulator (NSE Anchored)' : priceSource,
        executedAt: new Date().toISOString(),
      });
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
      setFeedback({
        type: 'ok',
        text: `${reasonNote ? `${reasonNote}: ` : ''}Virtual ${orderSide} executed: ${qty} × ${sym} @ ${formatINR(execPrice)} (Fees ₹${charges.toFixed(2)})`,
      });
      await loadAccount();
    },
    [user, getIdToken, simMode, productType, priceSource, loadAccount]
  );

  // Advance 1 simulated tick & evaluate pending orders / SL / Target brackets
  const advanceTick = useCallback(() => {
    const anchor = livePrice;
    if (!anchor) return;
    setSimStep((prevStep) => {
      const nextStep = prevStep + 1;
      setSimPrice((prevPx) => {
        const cur = prevPx ?? anchor;
        const nextPx = computeNextSimTick({
          currentPrice: cur,
          anchorPrice: anchor,
          atr: atrValue,
          step: nextStep,
        });

        // Update latest bar on TradingChart smoothly
        setChartBars((prevBars) => {
          if (prevBars.length === 0) return prevBars;
          const copy = [...prevBars];
          const last = copy[copy.length - 1];
          const updated: OHLCVBar = {
            ...last,
            high: Math.max(last.high, nextPx),
            low: Math.min(last.low, nextPx),
            close: nextPx,
            volume: last.volume + Math.round(1500 + nextStep * 45),
          };
          copy[copy.length - 1] = updated;
          return copy;
        });

        // Auto-check bracket SL / Target on selected symbol
        const held = positions.find((p) => p.symbol === selectedSymbol);
        if (held) {
          const hit = evaluateBracketExit({
            stopLoss: held.stopLoss,
            target: held.target,
            currentPrice: nextPx,
          });
          if (hit) {
            void executeOrderInternal({
              sym: held.symbol,
              orderSide: 'SELL',
              type: 'MARKET',
              qty: held.quantity,
              execPrice: nextPx,
              reasonNote: hit === 'STOP_LOSS' ? 'Stop-Loss Triggered' : 'Target Hit',
            });
          }
        }

        // Auto-check pending Limit / SL orders
        const matchingPending = pendingOrders.filter(
          (po) =>
            po.symbol === selectedSymbol &&
            shouldExecutePendingOrder({
              side: po.side,
              orderType: po.orderType,
              triggerPrice: po.triggerPrice,
              currentPrice: nextPx,
            })
        );

        if (matchingPending.length > 0) {
          setPendingOrders((prev) => prev.filter((o) => !matchingPending.some((m) => m.id === o.id)));
          for (const po of matchingPending) {
            void executeOrderInternal({
              sym: po.symbol,
              orderSide: po.side,
              type: po.orderType,
              qty: po.quantity,
              execPrice: nextPx,
              sl: po.stopLoss,
              tgt: po.target,
              reasonNote: `${po.orderType} Order Filled`,
            });
          }
        }

        return nextPx;
      });
      return nextStep;
    });
  }, [livePrice, atrValue, positions, selectedSymbol, pendingOrders, executeOrderInternal]);

  useEffect(() => {
    if (simMode !== 'TICK_REPLAY' || !simPlaying) return;
    const ms = Math.max(250, Math.round(1500 / simSpeed));
    const timer = setInterval(() => {
      advanceTick();
    }, ms);
    return () => clearInterval(timer);
  }, [simMode, simPlaying, simSpeed, advanceTick]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMarketPrice === null) {
      setFeedback({ type: 'err', text: 'Market price unavailable; select a liquid NSE stock.' });
      return;
    }

    const sl = Number(stopLossInput) > 0 ? Number(stopLossInput) : null;
    const tgt = Number(targetInput) > 0 ? Number(targetInput) : null;

    setBusy(true);
    setFeedback(null);
    try {
      if (orderType !== 'MARKET') {
        const trig = Number(limitPrice);
        if (!Number.isFinite(trig) || trig <= 0) {
          setFeedback({ type: 'err', text: 'Enter a valid Limit / Trigger price.' });
          return;
        }
        const fillsNow = shouldExecutePendingOrder({
          side,
          orderType,
          triggerPrice: trig,
          currentPrice: activeMarketPrice,
        });
        if (!fillsNow) {
          const newPending: PendingSimOrder = {
            id: `${Date.now()}`,
            symbol: selectedSymbol,
            side,
            orderType,
            productType,
            quantity,
            triggerPrice: trig,
            stopLoss: sl,
            target: tgt,
            createdAt: new Date().toISOString(),
          };
          setPendingOrders((prev) => [newPending, ...prev]);
          setActiveTab('pending');
          setFeedback({
            type: 'ok',
            text: `Pending ${orderType} ${side} placed for ${quantity} × ${selectedSymbol} @ ₹${trig.toFixed(2)}. Will auto-fill when price crosses trigger.`,
          });
          return;
        }
      }

      await executeOrderInternal({
        sym: selectedSymbol,
        orderSide: side,
        type: orderType,
        qty: quantity,
        execPrice: activeMarketPrice,
        sl,
        tgt,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSquareOff = async (pos: VirtualPosition) => {
    const px = pos.ltp ?? pos.avgPrice;
    setBusy(true);
    try {
      await executeOrderInternal({
        sym: pos.symbol,
        orderSide: 'SELL',
        type: 'MARKET',
        qty: pos.quantity,
        execPrice: px,
        reasonNote: 'Squared Off',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (capAmount = resetCapChoice) => {
    setBusy(true);
    setPendingOrders([]);
    setBracketsMap({});
    try {
      if (user) {
        const token = await getIdToken();
        if (!token) return;
        await fetch('/api/paper-trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'reset', initialCapital: capAmount }),
        });
      } else {
        window.localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify({
            initialCapital: capAmount,
            cashBalance: capAmount,
            realizedPnl: 0,
            positions: [],
            pendingOrders: [],
            trades: [],
          })
        );
      }
      await loadAccount();
      setFeedback({ type: 'ok', text: `Demo account reset to ${formatINR(capAmount)}.` });
    } finally {
      setBusy(false);
    }
  };

  const estPrice =
    orderType !== 'MARKET' && Number(limitPrice) > 0 ? Number(limitPrice) : activeMarketPrice ?? 0;
  const estOrderValue = estPrice * quantity;
  const charges = useMemo(
    () => calculateCharges({ side, productType, orderValue: estOrderValue }),
    [side, productType, estOrderValue]
  );
  const requiredMargin = useMemo(() => {
    const held = positions.find((p) => p.symbol === selectedSymbol);
    return calculateRequiredMargin({
      side,
      productType,
      orderValue: estOrderValue,
      isClosingExistingLong: Boolean(held && held.quantity >= quantity),
    });
  }, [side, productType, estOrderValue, positions, selectedSymbol, quantity]);

  const analytics = useMemo(() => computePaperAnalytics(trades), [trades]);

  const maxAffordableQty =
    estPrice > 0 ? Math.max(1, Math.floor((account.cashBalance * (productType === 'MIS' ? 5 : 1)) / estPrice)) : 1;

  const chartExtraLines: ExtraPriceLine[] = useMemo(() => {
    const lines: ExtraPriceLine[] = [];
    const held = positions.find((p) => p.symbol === selectedSymbol);
    if (held) {
      lines.push({ price: held.avgPrice, color: '#3B82F6', title: `Avg Entry (${held.quantity})`, lineStyle: 0 });
      if (held.stopLoss) lines.push({ price: held.stopLoss, color: '#EF4444', title: 'SL', lineStyle: 2 });
      if (held.target) lines.push({ price: held.target, color: '#10B981', title: 'Target', lineStyle: 2 });
    }
    if (Number(stopLossInput) > 0) {
      lines.push({ price: Number(stopLossInput), color: '#F97316', title: 'Draft SL', lineStyle: 3 });
    }
    if (Number(targetInput) > 0) {
      lines.push({ price: Number(targetInput), color: '#22C55E', title: 'Draft Target', lineStyle: 3 });
    }
    return lines;
  }, [positions, selectedSymbol, stopLossInput, targetInput]);

  return (
    <TerminalShell breadcrumb={t.nav.paperTrading}>
      <div className="space-y-5">
        {/* Simulation Mode & Virtual Risk Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-amber-600 dark:text-amber-400">
              <span>{t.paperTrading.virtualBadge}</span>
              <span>·</span>
              <span className="font-mono">
                {simMode === 'TICK_REPLAY' ? `DEMO TICK REPLAY (${simSpeed}x)` : 'LIVE NSE FEED'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {language === 'hi' ? 'उन्नत डेमो ट्रेडिंग सिम्युलेटर (24/7)' : 'Demo Trading Simulation Terminal (24/7)'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {t.paperTrading.virtualDisclaimer}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/80 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSimMode('LIVE');
                  setSimPlaying(false);
                }}
                className={`px-2.5 py-1 rounded font-medium ${
                  simMode === 'LIVE' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Live Feed
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimMode('TICK_REPLAY');
                  if (simPrice === null && livePrice !== null) setSimPrice(livePrice);
                }}
                className={`px-2.5 py-1 rounded font-medium ${
                  simMode === 'TICK_REPLAY' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Demo Tick Simulator
              </button>
            </div>

            {simMode === 'TICK_REPLAY' && (
              <div className="flex items-center gap-1 bg-white/80 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSimPlaying((p) => !p)}
                  aria-label={simPlaying ? 'Pause simulation' : 'Play simulation'}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-medium"
                >
                  {simPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{simPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={advanceTick}
                  aria-label="Step one simulated tick"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  title="Step +1 Tick"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                {([1, 2, 5, 10] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSimSpeed(sp)}
                    className={`px-1.5 py-1 rounded font-mono ${
                      simSpeed === sp ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            )}

            {!user && (
              <button
                type="button"
                onClick={openAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sync with Gmail</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1">
              <select
                aria-label="Select reset virtual capital"
                value={resetCapChoice}
                onChange={(e) => setResetCapChoice(Number(e.target.value))}
                className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D1A] text-xs font-mono text-slate-900 dark:text-slate-100"
              >
                <option value={100000}>₹1,00,000</option>
                <option value={500000}>₹5,00,000</option>
                <option value={1000000}>₹10,00,000</option>
              </select>
              <button
                type="button"
                onClick={() => handleReset(resetCapChoice)}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Account KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            [t.paperTrading.totalPortfolioValue, formatINR(account.totalNetWorth)],
            [t.paperTrading.virtualCash, formatINR(account.cashBalance)],
            [t.paperTrading.investedValue, formatINR(account.investedValue)],
            [t.paperTrading.unrealizedPnl, formatINR(account.unrealizedPnl), account.unrealizedPnl],
            [t.paperTrading.realizedPnl, formatINR(account.realizedPnl), account.realizedPnl],
            ['Win Rate / Trades', `${analytics.winRatePct}% (${analytics.totalTrades})`],
          ].map(([label, val, num]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-3.5"
            >
              <div className="text-[11px] text-slate-500">{label}</div>
              <div
                className={`font-mono tabular-nums text-base font-bold mt-1 ${
                  typeof num === 'number'
                    ? num > 0
                      ? 'text-emerald-500'
                      : num < 0
                        ? 'text-red-500'
                        : 'text-slate-900 dark:text-white'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Order Ticket + Live Chart & Portfolio Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Virtual Order Ticket */}
          <form
            onSubmit={handlePlaceOrder}
            className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.paperTrading.placeVirtualOrder}</h2>
              <button
                type="button"
                onClick={loadSelectedQuote}
                aria-label="Refresh quote"
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label htmlFor="paper-symbol-picker" className="block text-xs font-medium text-slate-500 mb-1">
                {t.common.symbol} (All 2,647+ NSE Stocks)
              </label>
              <StockPicker
                id="paper-symbol-picker"
                ariaLabel="Select stock for demo trade"
                value={selectedSymbol}
                onChange={setSelectedSymbol}
              />
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  {simMode === 'TICK_REPLAY' ? `Sim Tick #${simStep}:` : 'Live/Latest LTP:'}
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {activeMarketPrice !== null ? formatINR(activeMarketPrice) : t.common.unavailable}
                </span>
              </div>
              {priceTimestamp && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Anchor: {new Date(priceTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  side === 'BUY'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                VIRTUAL BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  side === 'SELL'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                VIRTUAL SELL
              </button>
            </div>

            {/* Product Type CNC vs MIS 5x */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setProductType('CNC')}
                className={`py-1.5 px-2 rounded-lg border font-medium ${
                  productType === 'CNC'
                    ? 'border-blue-500 bg-blue-600/15 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                Delivery (CNC 1x)
              </button>
              <button
                type="button"
                onClick={() => setProductType('MIS')}
                className={`py-1.5 px-2 rounded-lg border font-medium ${
                  productType === 'MIS'
                    ? 'border-blue-500 bg-blue-600/15 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                Intraday (MIS 5x)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="paper-order-type" className="block text-xs font-medium text-slate-500 mb-1">
                  {t.paperTrading.orderType}
                </label>
                <select
                  id="paper-order-type"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as SimOrderType)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs font-medium text-slate-900 dark:text-slate-100"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                  <option value="SL">STOP-LOSS (SL)</option>
                </select>
              </div>
              <div>
                <label htmlFor="paper-qty" className="block text-xs font-medium text-slate-500 mb-1">
                  {t.paperTrading.quantity}
                </label>
                <input
                  id="paper-qty"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value))))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Quick Qty Chips */}
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
              {[1, 5, 10, 25, 50].map((qChip) => (
                <button
                  key={qChip}
                  type="button"
                  onClick={() => setQuantity(qChip)}
                  className={`px-2 py-1 rounded border ${
                    quantity === qChip
                      ? 'border-blue-500 bg-blue-600/10 text-blue-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {qChip}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuantity(maxAffordableQty)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500"
              >
                Max ({maxAffordableQty})
              </button>
            </div>

            {orderType !== 'MARKET' && (
              <div>
                <label htmlFor="paper-limit" className="block text-xs font-medium text-slate-500 mb-1">
                  {orderType === 'SL' ? 'Stop-Loss Trigger Price (₹)' : 'Limit Price (₹)'}
                </label>
                <input
                  id="paper-limit"
                  type="number"
                  step="0.05"
                  required
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={activeMarketPrice ? String(activeMarketPrice) : '0.00'}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Optional Bracket SL & Target */}
            {side === 'BUY' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="paper-sl" className="block text-[11px] text-slate-500 mb-1">
                    Bracket SL (₹ opt)
                  </label>
                  <input
                    id="paper-sl"
                    type="number"
                    step="0.05"
                    value={stopLossInput}
                    onChange={(e) => setStopLossInput(e.target.value)}
                    placeholder="Optional SL"
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="paper-tgt" className="block text-[11px] text-slate-500 mb-1">
                    Target (₹ opt)
                  </label>
                  <input
                    id="paper-tgt"
                    type="number"
                    step="0.05"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Optional Target"
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Margin & Charges Estimator */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Order Value</span>
                <span className="font-mono tabular-nums font-medium whitespace-nowrap">
                  {formatINR(estOrderValue)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Margin Required ({productType})</span>
                <span className="font-mono tabular-nums font-semibold whitespace-nowrap text-slate-900 dark:text-white">
                  {formatINR(requiredMargin)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-[11px] text-slate-500">
                <span>Est. NSE Brokerage + STT + GST</span>
                <span className="font-mono tabular-nums whitespace-nowrap">₹{charges.totalCharges.toFixed(2)}</span>
              </div>
            </div>

            {feedback && (
              <div
                className={`text-xs p-2.5 rounded-lg ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || activeMarketPrice === null}
              className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 ${
                side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {busy
                ? t.common.loading
                : side === 'BUY'
                  ? t.paperTrading.executeBuy
                  : t.paperTrading.executeSell}
            </button>
          </form>

          {/* Right Column: Embedded Chart + Holdings / Pending / History */}
          <div className="lg:col-span-8 space-y-5">
            {chartBars.length > 0 && (
              <TradingChart
                symbol={selectedSymbol}
                bars={chartBars}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                extraLines={chartExtraLines}
                height={320}
              />
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#080D1A]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('positions')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      activeTab === 'positions'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {t.paperTrading.positionsTab} ({positions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      activeTab === 'pending'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Pending Orders ({pendingOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      activeTab === 'history'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {t.paperTrading.historyTab} ({trades.length})
                  </button>
                </div>
                <span className="text-[11px] font-mono text-amber-500 font-semibold">
                  Profit Factor: {analytics.profitFactor === null ? '∞' : analytics.profitFactor}
                </span>
              </div>

              {activeTab === 'positions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-4">Symbol</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4 text-right">Avg Price</th>
                        <th className="py-2.5 px-4 text-right">LTP</th>
                        <th className="py-2.5 px-4 text-right">SL / Target</th>
                        <th className="py-2.5 px-4 text-right">Unrealized P&L</th>
                        <th className="py-2.5 px-4 text-right">Exit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            {t.paperTrading.noPositions}
                          </td>
                        </tr>
                      ) : (
                        positions.map((pos) => (
                          <tr
                            key={pos.symbol}
                            className="border-b last:border-0 border-slate-100 dark:border-slate-800/60"
                          >
                            <td className="py-2.5 px-4">
                              <Link
                                href={`/stocks/${pos.symbol}`}
                                className="font-mono font-semibold text-blue-500 hover:underline"
                              >
                                {pos.symbol}
                              </Link>
                              <div className="text-slate-500 truncate max-w-[160px]">{pos.companyName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{pos.quantity}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatINR(pos.avgPrice)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatINR(pos.ltp)}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[11px] text-slate-500">
                              {pos.stopLoss ? `SL ₹${pos.stopLoss}` : '—'} / {pos.target ? `T ₹${pos.target}` : '—'}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                                pos.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {pos.unrealizedPnl >= 0 ? '+' : ''}
                              {formatINR(pos.unrealizedPnl)} ({pos.unrealizedPct.toFixed(2)}%)
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSquareOff(pos)}
                                className="px-2.5 py-1 rounded bg-red-600/15 text-red-500 hover:bg-red-600 hover:text-white font-semibold transition-colors whitespace-nowrap"
                              >
                                Square Off
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-4">Symbol</th>
                        <th className="py-2.5 px-4">Side / Type</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4 text-right">Trigger Price</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-500">
                            No pending LIMIT or SL orders. Use Limit/SL in the order ticket to stage bracket triggers.
                          </td>
                        </tr>
                      ) : (
                        pendingOrders.map((po) => (
                          <tr key={po.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                            <td className="py-2.5 px-4 font-mono font-semibold">{po.symbol}</td>
                            <td className="py-2.5 px-4 font-mono">
                              {po.side} · {po.orderType} ({po.productType})
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{po.quantity}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatINR(po.triggerPrice)}</td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setPendingOrders((prev) => prev.filter((x) => x.id !== po.id))}
                                className="text-red-500 hover:underline font-medium"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Symbol</th>
                        <th className="py-2.5 px-4">Side</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4 text-right">Price</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                        <th className="py-2.5 px-4 text-right">Realized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            {t.paperTrading.noTrades}
                          </td>
                        </tr>
                      ) : (
                        trades.map((tr) => (
                          <tr
                            key={tr.id}
                            className="border-b last:border-0 border-slate-100 dark:border-slate-800/60"
                          >
                            <td className="py-2.5 px-4 font-mono text-slate-500">
                              {new Date(tr.executedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-semibold">{tr.symbol}</td>
                            <td
                              className={`py-2.5 px-4 font-bold ${
                                tr.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              VIRTUAL {tr.side}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{tr.quantity}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              {formatINR(Number(tr.executedPrice))}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              {formatINR(Number(tr.totalValue))}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              {Number(tr.realizedPnl) !== 0 ? formatINR(Number(tr.realizedPnl)) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}

export default function PaperTradingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading demo trading simulation...</div>}>
      <PaperTradingInner />
    </Suspense>
  );
}
