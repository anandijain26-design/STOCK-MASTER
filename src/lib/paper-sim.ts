export type ProductType = 'CNC' | 'MIS';
export type SimOrderType = 'MARKET' | 'LIMIT' | 'SL';
export type TradeSide = 'BUY' | 'SELL';

export interface BrokerageBreakdown {
  brokerage: number;
  stt: number;
  exchangeFee: number;
  sebiCharges: number;
  stampDuty: number;
  gst: number;
  totalCharges: number;
}

/**
 * Computes realistic Zerodha-style NSE equity delivery (CNC) & intraday (MIS) charges.
 */
export function calculateCharges(params: {
  side: TradeSide;
  productType: ProductType;
  orderValue: number;
}): BrokerageBreakdown {
  const { side, productType, orderValue } = params;
  if (!Number.isFinite(orderValue) || orderValue <= 0) {
    return {
      brokerage: 0,
      stt: 0,
      exchangeFee: 0,
      sebiCharges: 0,
      stampDuty: 0,
      gst: 0,
      totalCharges: 0,
    };
  }

  const brokerage =
    productType === 'CNC' ? 0 : Math.min(20, orderValue * 0.0003);

  const stt =
    productType === 'CNC'
      ? Math.round(orderValue * 0.001)
      : side === 'SELL'
        ? Math.round(orderValue * 0.00025)
        : 0;

  const exchangeFee = orderValue * 0.0000297;
  const sebiCharges = orderValue * 0.000001;
  const stampDuty =
    side === 'BUY'
      ? productType === 'CNC'
        ? Math.round(orderValue * 0.00015)
        : Math.round(orderValue * 0.00003)
      : 0;

  const gst = (brokerage + exchangeFee + sebiCharges) * 0.18;
  const totalCharges = brokerage + stt + exchangeFee + sebiCharges + stampDuty + gst;

  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    brokerage: r(brokerage),
    stt: r(stt),
    exchangeFee: r(exchangeFee),
    sebiCharges: r(sebiCharges),
    stampDuty: r(stampDuty),
    gst: r(gst),
    totalCharges: r(totalCharges),
  };
}

/**
 * Margin requirement: CNC requires 100% of value on BUY; MIS intraday requires 20% (5x leverage).
 */
export function calculateRequiredMargin(params: {
  side: TradeSide;
  productType: ProductType;
  orderValue: number;
  isClosingExistingLong?: boolean;
}): number {
  const { side, productType, orderValue, isClosingExistingLong } = params;
  if (orderValue <= 0) return 0;
  if (side === 'SELL' && isClosingExistingLong) return 0;
  const leverageFactor = productType === 'MIS' ? 0.2 : 1.0;
  return Math.round(orderValue * leverageFactor * 100) / 100;
}

/**
 * Determines whether a pending LIMIT or SL order should fill at the current simulated/live price.
 */
export function shouldExecutePendingOrder(params: {
  side: TradeSide;
  orderType: SimOrderType;
  triggerPrice: number;
  currentPrice: number;
}): boolean {
  const { side, orderType, triggerPrice, currentPrice } = params;
  if (orderType === 'MARKET') return true;
  if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) return false;

  if (orderType === 'LIMIT') {
    return side === 'BUY' ? currentPrice <= triggerPrice : currentPrice >= triggerPrice;
  }

  // Stop-loss (SL) trigger order
  return side === 'BUY' ? currentPrice >= triggerPrice : currentPrice <= triggerPrice;
}

/**
 * Checks whether an open long position's Stop-Loss or Target bracket has been hit.
 */
export function evaluateBracketExit(params: {
  stopLoss?: number | null;
  target?: number | null;
  currentPrice: number;
}): 'STOP_LOSS' | 'TARGET' | null {
  const { stopLoss, target, currentPrice } = params;
  if (stopLoss && stopLoss > 0 && currentPrice <= stopLoss) return 'STOP_LOSS';
  if (target && target > 0 && currentPrice >= target) return 'TARGET';
  return null;
}

/**
 * Generates deterministic, realistic NSE-sized tick movements for 24/7 Demo Tick Replay Mode.
 * Bounded by ATR / volatility around a real anchor price.
 */
export function computeNextSimTick(params: {
  currentPrice: number;
  anchorPrice: number;
  atr?: number | null;
  step: number;
}): number {
  const { currentPrice, anchorPrice, atr, step } = params;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return anchorPrice;

  const effectiveAtr = atr && atr > 0 ? atr : currentPrice * 0.012;
  const maxStepMove = Math.max(0.05, effectiveAtr * 0.14);

  // Deterministic pseudo-random wave + mean reversion pull back toward anchorPrice
  const wave =
    Math.sin(step * 1.71 + anchorPrice * 0.13) * 0.65 +
    Math.cos(step * 2.93) * 0.35;
  const driftBias = ((anchorPrice - currentPrice) / anchorPrice) * 0.8;
  const rawNext = currentPrice + wave * maxStepMove + driftBias * maxStepMove;

  // NSE tick size rounding (0.05 INR)
  const rounded = Math.round(rawNext * 20) / 20;
  return Math.max(0.5, Math.round(rounded * 100) / 100);
}

export interface AnalyticsTradeInput {
  side: string;
  realizedPnl: number | string;
}

export interface PaperAnalytics {
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  netRealizedPnl: number;
}

export function computePaperAnalytics(trades: AnalyticsTradeInput[]): PaperAnalytics {
  const totalTrades = trades.length;
  let closedTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let netRealizedPnl = 0;

  for (const t of trades) {
    const pnl = Number(t.realizedPnl) || 0;
    if (t.side === 'SELL' || pnl !== 0) {
      closedTrades += 1;
      netRealizedPnl += pnl;
      if (pnl > 0) {
        winningTrades += 1;
        grossProfit += pnl;
      } else if (pnl < 0) {
        losingTrades += 1;
        grossLoss += Math.abs(pnl);
      }
    }
  }

  const winRatePct =
    closedTrades > 0 ? Math.round((winningTrades / closedTrades) * 1000) / 10 : 0;
  const profitFactor =
    grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? null : 0;

  return {
    totalTrades,
    closedTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    profitFactor,
    netRealizedPnl: Math.round(netRealizedPnl * 100) / 100,
  };
}
