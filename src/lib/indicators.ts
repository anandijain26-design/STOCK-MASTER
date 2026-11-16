export interface OHLCVBar {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSummary {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  dema20: number | null;
  tema20: number | null;
  vwap: number | null;
  supertrend: { value: number | null; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' };
  ichimoku: {
    tenkan: number | null;
    kijun: number | null;
    senkouA: number | null;
    senkouB: number | null;
  };
  psar: number | null;
  adx: number | null;
  macd: { macd: number | null; signal: number | null; histogram: number | null; crossover: 'BULLISH' | 'BEARISH' | 'NONE' };
  rsi14: number | null;
  stochRsi: { k: number | null; d: number | null };
  stochastic: { k: number | null; d: number | null };
  cci20: number | null;
  roc12: number | null;
  williamsR14: number | null;
  momentum10: number | null;
  bollinger: { upper: number | null; middle: number | null; lower: number | null };
  atr14: number | null;
  keltner: { upper: number | null; middle: number | null; lower: number | null };
  donchian: { upper: number | null; middle: number | null; lower: number | null };
  stdDev20: number | null;
  obv: number | null;
  mfi14: number | null;
  cmf20: number | null;
  adLine: number | null;
  relativeVolume: number | null;
  pivots: {
    pp: number | null;
    r1: number | null;
    r2: number | null;
    r3: number | null;
    s1: number | null;
    s2: number | null;
    s3: number | null;
  };
  fibonacci: {
    swingHigh: number | null;
    swingLow: number | null;
    r236: number | null;
    r382: number | null;
    r500: number | null;
    r618: number | null;
    r786: number | null;
    ext1272: number | null;
    ext1618: number | null;
  };
  supportLevels: number[];
  resistanceLevels: number[];
  patterns: string[];
  structure: {
    gapType: 'GAP_UP' | 'GAP_DOWN' | 'NONE';
    breakout: 'BREAKOUT' | 'BREAKDOWN' | 'NONE';
    trendStructure: 'HH_HL' | 'LH_LL' | 'CONSOLIDATION';
  };
  volumeProfile: Array<{ priceLevel: number; volume: number }>;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function computeSMA(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = round2(sum / period);
  }
  return out;
}

export function computeEMA(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  out[period - 1] = round2(ema);
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = round2(ema);
  }
  return out;
}

export function computeDEMA(values: number[], period: number): (number | null)[] {
  const ema1 = computeEMA(values, period);
  const validEma1 = ema1.filter((x): x is number => x !== null);
  const ema2Compact = computeEMA(validEma1, period);
  const out: (number | null)[] = new Array(values.length).fill(null);
  const offset = ema1.findIndex((x) => x !== null);
  if (offset < 0) return out;
  for (let i = 0; i < ema2Compact.length; i++) {
    const e1 = ema1[i + offset];
    const e2 = ema2Compact[i];
    if (e1 !== null && e2 !== null) {
      out[i + offset] = round2(2 * e1 - e2);
    }
  }
  return out;
}

export function computeTEMA(values: number[], period: number): (number | null)[] {
  const ema1 = computeEMA(values, period);
  const valid1 = ema1.filter((x): x is number => x !== null);
  const ema2Compact = computeEMA(valid1, period);
  const valid2 = ema2Compact.filter((x): x is number => x !== null);
  const ema3Compact = computeEMA(valid2, period);
  const out: (number | null)[] = new Array(values.length).fill(null);
  const off1 = ema1.findIndex((x) => x !== null);
  const off2 = ema2Compact.findIndex((x) => x !== null);
  if (off1 < 0 || off2 < 0) return out;
  for (let i = 0; i < ema3Compact.length; i++) {
    const e3 = ema3Compact[i];
    const idx2 = i + off2;
    const idx1 = idx2 + off1;
    const e1 = ema1[idx1];
    const e2 = ema2Compact[idx2];
    if (e1 !== null && e2 !== null && e3 !== null) {
      out[idx1] = round2(3 * e1 - 3 * e2 + e3);
    }
  }
  return out;
}

export function computeRSI(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : round2(100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : round2(100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

export function computeMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = computeEMA(closes, fast);
  const slowEma = computeEMA(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? round2(fastEma[i]! - slowEma[i]!) : null
  );
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalCompact = computeEMA(validMacd, signalPeriod);
  const offset = macdLine.findIndex((v) => v !== null);
  const signal: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  if (offset >= 0) {
    for (let i = 0; i < signalCompact.length; i++) {
      const s = signalCompact[i];
      const m = macdLine[i + offset];
      if (s !== null && m !== null) {
        signal[i + offset] = s;
        histogram[i + offset] = round2(m - s);
      }
    }
  }
  return { macd: macdLine, signal, histogram };
}

export function computeATR(bars: OHLCVBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return out;
  const trs: number[] = [bars[0].high - bars[0].low];
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    trs.push(tr);
  }
  let atr = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = round2(atr);
  for (let i = period + 1; i < bars.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out[i] = round2(atr);
  }
  return out;
}

export function computeBollingerBands(closes: number[], period = 20, mult = 2) {
  const middle = computeSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const stdDev: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const m = middle[i];
    if (m === null) continue;
    const slice = closes.slice(i - period + 1, i + 1);
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / period;
    const sd = Math.sqrt(variance);
    stdDev[i] = round2(sd);
    upper[i] = round2(m + mult * sd);
    lower[i] = round2(m - mult * sd);
  }
  return { upper, middle, lower, stdDev };
}

export function computeSupertrend(
  bars: OHLCVBar[],
  period = 10,
  multiplier = 3
): Array<{ value: number | null; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }> {
  const atr = computeATR(bars, period);
  const result: Array<{ value: number | null; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }> =
    bars.map(() => ({ value: null, trend: 'NEUTRAL' }));
  if (bars.length <= period) return result;

  let finalUpper = 0;
  let finalLower = 0;
  let inUptrend = true;

  for (let i = period; i < bars.length; i++) {
    const a = atr[i];
    if (a === null) continue;
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const basicUpper = hl2 + multiplier * a;
    const basicLower = hl2 - multiplier * a;

    if (i === period) {
      finalUpper = basicUpper;
      finalLower = basicLower;
      inUptrend = bars[i].close >= hl2;
    } else {
      finalUpper =
        basicUpper < finalUpper || bars[i - 1].close > finalUpper ? basicUpper : finalUpper;
      finalLower =
        basicLower > finalLower || bars[i - 1].close < finalLower ? basicLower : finalLower;

      if (inUptrend && bars[i].close < finalLower) inUptrend = false;
      else if (!inUptrend && bars[i].close > finalUpper) inUptrend = true;
    }

    result[i] = {
      value: round2(inUptrend ? finalLower : finalUpper),
      trend: inUptrend ? 'BULLISH' : 'BEARISH',
    };
  }
  return result;
}

export function computeVWAP(bars: OHLCVBar[]): (number | null)[] {
  let cumPV = 0;
  let cumV = 0;
  return bars.map((b) => {
    const typical = (b.high + b.low + b.close) / 3;
    const vol = b.volume > 0 ? b.volume : 1;
    cumPV += typical * vol;
    cumV += vol;
    return cumV > 0 ? round2(cumPV / cumV) : null;
  });
}

export function computeHeikinAshi(bars: OHLCVBar[]): OHLCVBar[] {
  if (bars.length === 0) return [];
  const out: OHLCVBar[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = round2((b.open + b.high + b.low + b.close) / 4);
    const haOpen =
      i === 0 ? round2((b.open + b.close) / 2) : round2((out[i - 1].open + out[i - 1].close) / 2);
    const haHigh = round2(Math.max(b.high, haOpen, haClose));
    const haLow = round2(Math.min(b.low, haOpen, haClose));
    out.push({
      time: b.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: b.volume,
    });
  }
  return out;
}

export function computeStochastic(bars: OHLCVBar[], kPeriod = 14, dPeriod = 3) {
  const kArr: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const slice = bars.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...slice.map((b) => b.high));
    const ll = Math.min(...slice.map((b) => b.low));
    kArr[i] = hh === ll ? 50 : round2(((bars[i].close - ll) / (hh - ll)) * 100);
  }
  const validK = kArr.filter((v): v is number => v !== null);
  const dCompact = computeSMA(validK, dPeriod);
  const dArr: (number | null)[] = new Array(bars.length).fill(null);
  const offset = kArr.findIndex((v) => v !== null);
  if (offset >= 0) {
    for (let i = 0; i < dCompact.length; i++) dArr[i + offset] = dCompact[i];
  }
  return { k: kArr, d: dArr };
}

export function computeADX(bars: OHLCVBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period * 2) return out;
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [bars[0].high - bars[0].low];

  for (let i = 1; i < bars.length; i++) {
    const up = bars[i].high - bars[i - 1].high;
    const down = bars[i - 1].low - bars[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(
      Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close)
      )
    );
  }

  let sTR = tr.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let sPlus = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let sMinus = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];
  for (let i = period; i < bars.length; i++) {
    if (i > period) {
      sTR = sTR - sTR / period + tr[i];
      sPlus = sPlus - sPlus / period + plusDM[i];
      sMinus = sMinus - sMinus / period + minusDM[i];
    }
    const pDI = sTR > 0 ? (100 * sPlus) / sTR : 0;
    const mDI = sTR > 0 ? (100 * sMinus) / sTR : 0;
    const denom = pDI + mDI;
    const dx = denom > 0 ? (100 * Math.abs(pDI - mDI)) / denom : 0;
    dxList.push(dx);
    if (dxList.length >= period) {
      const recent = dxList.slice(-period);
      out[i] = round2(recent.reduce((a, b) => a + b, 0) / period);
    }
  }
  return out;
}

export function detectCandlestickPatterns(bars: OHLCVBar[]): string[] {
  if (bars.length < 3) return [];
  const patterns: string[] = [];
  const curr = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const body = Math.abs(curr.close - curr.open);
  const range = Math.max(0.01, curr.high - curr.low);
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;

  if (body / range < 0.12) patterns.push('Doji');
  if (lowerWick > body * 2 && upperWick < body * 0.6 && curr.close >= curr.open) {
    patterns.push('Hammer (Bullish)');
  }
  if (upperWick > body * 2 && lowerWick < body * 0.6 && curr.close < curr.open) {
    patterns.push('Shooting Star (Bearish)');
  }
  if (
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.open <= prev.close &&
    curr.close >= prev.open
  ) {
    patterns.push('Bullish Engulfing');
  }
  if (
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.open >= prev.close &&
    curr.close <= prev.open
  ) {
    patterns.push('Bearish Engulfing');
  }
  return patterns;
}

export function analyzeTechnicals(bars: OHLCVBar[]): TechnicalSummary {
  const empty: TechnicalSummary = {
    sma20: null,
    sma50: null,
    sma200: null,
    ema20: null,
    ema50: null,
    ema200: null,
    dema20: null,
    tema20: null,
    vwap: null,
    supertrend: { value: null, trend: 'NEUTRAL' },
    ichimoku: { tenkan: null, kijun: null, senkouA: null, senkouB: null },
    psar: null,
    adx: null,
    macd: { macd: null, signal: null, histogram: null, crossover: 'NONE' },
    rsi14: null,
    stochRsi: { k: null, d: null },
    stochastic: { k: null, d: null },
    cci20: null,
    roc12: null,
    williamsR14: null,
    momentum10: null,
    bollinger: { upper: null, middle: null, lower: null },
    atr14: null,
    keltner: { upper: null, middle: null, lower: null },
    donchian: { upper: null, middle: null, lower: null },
    stdDev20: null,
    obv: null,
    mfi14: null,
    cmf20: null,
    adLine: null,
    relativeVolume: null,
    pivots: { pp: null, r1: null, r2: null, r3: null, s1: null, s2: null, s3: null },
    fibonacci: {
      swingHigh: null,
      swingLow: null,
      r236: null,
      r382: null,
      r500: null,
      r618: null,
      r786: null,
      ext1272: null,
      ext1618: null,
    },
    supportLevels: [],
    resistanceLevels: [],
    patterns: [],
    structure: { gapType: 'NONE', breakout: 'NONE', trendStructure: 'CONSOLIDATION' },
    volumeProfile: [],
  };

  if (bars.length < 5) return empty;
  const closes = bars.map((b) => b.close);
  const lastIdx = bars.length - 1;
  const last = bars[lastIdx];
  const prev = bars[lastIdx - 1];

  const sma20 = computeSMA(closes, 20)[lastIdx] ?? null;
  const sma50 = computeSMA(closes, 50)[lastIdx] ?? null;
  const sma200 = computeSMA(closes, 200)[lastIdx] ?? null;
  const ema20Arr = computeEMA(closes, 20);
  const ema50Arr = computeEMA(closes, 50);
  const ema200Arr = computeEMA(closes, 200);
  const ema20 = ema20Arr[lastIdx] ?? null;
  const ema50 = ema50Arr[lastIdx] ?? null;
  const ema200 = ema200Arr[lastIdx] ?? null;
  const dema20 = computeDEMA(closes, 20)[lastIdx] ?? null;
  const tema20 = computeTEMA(closes, 20)[lastIdx] ?? null;
  const vwap = computeVWAP(bars)[lastIdx] ?? null;
  const stArr = computeSupertrend(bars, 10, 3);
  const supertrend = stArr[lastIdx] ?? { value: null, trend: 'NEUTRAL' };

  // Ichimoku
  const highLowMid = (n: number) => {
    if (bars.length < n) return null;
    const s = bars.slice(-n);
    return round2((Math.max(...s.map((b) => b.high)) + Math.min(...s.map((b) => b.low))) / 2);
  };
  const tenkan = highLowMid(9);
  const kijun = highLowMid(26);
  const senkouA = tenkan !== null && kijun !== null ? round2((tenkan + kijun) / 2) : null;
  const senkouB = highLowMid(52);

  // Parabolic SAR simplified trailing estimate
  const recent20 = bars.slice(-20);
  const recentHigh20 = Math.max(...recent20.map((b) => b.high));
  const recentLow20 = Math.min(...recent20.map((b) => b.low));
  const psar = round2(
    last.close >= (sma20 ?? last.close) ? recentLow20 + 0.02 * (recentHigh20 - recentLow20) : recentHigh20 - 0.02 * (recentHigh20 - recentLow20)
  );

  const adx = computeADX(bars, 14)[lastIdx] ?? null;

  // MACD
  const macdObj = computeMACD(closes);
  const macdVal = macdObj.macd[lastIdx];
  const sigVal = macdObj.signal[lastIdx];
  const prevMacd = macdObj.macd[lastIdx - 1];
  const prevSig = macdObj.signal[lastIdx - 1];
  let crossover: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
  if (macdVal !== null && sigVal !== null && prevMacd !== null && prevSig !== null) {
    if (prevMacd <= prevSig && macdVal > sigVal) crossover = 'BULLISH';
    else if (prevMacd >= prevSig && macdVal < sigVal) crossover = 'BEARISH';
  }

  // Momentum
  const rsiArr = computeRSI(closes, 14);
  const rsi14 = rsiArr[lastIdx] ?? null;
  const validRsi = rsiArr.filter((v): v is number => v !== null);
  const stochRsiK =
    validRsi.length >= 14
      ? (() => {
          const sl = validRsi.slice(-14);
          const mn = Math.min(...sl);
          const mx = Math.max(...sl);
          return mx === mn ? 50 : round2(((validRsi[validRsi.length - 1] - mn) / (mx - mn)) * 100);
        })()
      : null;

  const stoch = computeStochastic(bars, 14, 3);
  const stochastic = { k: stoch.k[lastIdx] ?? null, d: stoch.d[lastIdx] ?? null };

  // CCI(20)
  let cci20: number | null = null;
  if (bars.length >= 20) {
    const tp = bars.slice(-20).map((b) => (b.high + b.low + b.close) / 3);
    const meanTp = tp.reduce((a, b) => a + b, 0) / 20;
    const mad = tp.reduce((a, b) => a + Math.abs(b - meanTp), 0) / 20;
    cci20 = mad > 0 ? round2((tp[tp.length - 1] - meanTp) / (0.015 * mad)) : 0;
  }

  const roc12 =
    bars.length > 12 ? round2(((last.close - bars[lastIdx - 12].close) / bars[lastIdx - 12].close) * 100) : null;
  const momentum10 = bars.length > 10 ? round2(last.close - bars[lastIdx - 10].close) : null;

  let williamsR14: number | null = null;
  if (bars.length >= 14) {
    const sl = bars.slice(-14);
    const hh = Math.max(...sl.map((b) => b.high));
    const ll = Math.min(...sl.map((b) => b.low));
    williamsR14 = hh === ll ? -50 : round2(((hh - last.close) / (hh - ll)) * -100);
  }

  // Volatility
  const bb = computeBollingerBands(closes, 20, 2);
  const atr14 = computeATR(bars, 14)[lastIdx] ?? null;
  const stdDev20 = bb.stdDev[lastIdx] ?? null;
  const keltner = {
    upper: ema20 !== null && atr14 !== null ? round2(ema20 + 2 * atr14) : null,
    middle: ema20,
    lower: ema20 !== null && atr14 !== null ? round2(ema20 - 2 * atr14) : null,
  };
  const donchian = {
    upper: round2(recentHigh20),
    middle: round2((recentHigh20 + recentLow20) / 2),
    lower: round2(recentLow20),
  };

  // Volume indicators
  let obv = 0;
  let adLine = 0;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) obv += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) obv -= bars[i].volume;
    const rng = bars[i].high - bars[i].low;
    if (rng > 0) {
      const mfm = ((bars[i].close - bars[i].low) - (bars[i].high - bars[i].close)) / rng;
      adLine += mfm * bars[i].volume;
    }
  }

  let mfi14: number | null = null;
  if (bars.length >= 15) {
    let posMF = 0;
    let negMF = 0;
    for (let i = bars.length - 14; i < bars.length; i++) {
      const tp = (bars[i].high + bars[i].low + bars[i].close) / 3;
      const pTp = (bars[i - 1].high + bars[i - 1].low + bars[i - 1].close) / 3;
      const mf = tp * bars[i].volume;
      if (tp >= pTp) posMF += mf;
      else negMF += mf;
    }
    mfi14 = negMF === 0 ? 100 : round2(100 - 100 / (1 + posMF / negMF));
  }

  let cmf20: number | null = null;
  if (bars.length >= 20) {
    let sumMFV = 0;
    let sumVol = 0;
    for (const b of bars.slice(-20)) {
      const rng = b.high - b.low;
      const mfm = rng > 0 ? ((b.close - b.low) - (b.high - b.close)) / rng : 0;
      sumMFV += mfm * b.volume;
      sumVol += b.volume;
    }
    cmf20 = sumVol > 0 ? round2(sumMFV / sumVol) : 0;
  }

  const volSlice = bars.slice(-21, -1).map((b) => b.volume).filter((v) => v > 0);
  const avgVol20 = volSlice.length > 0 ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length : 0;
  const relativeVolume = avgVol20 > 0 ? round2(last.volume / avgVol20) : null;

  // Pivot Points (using previous session bar)
  const pp = round2((prev.high + prev.low + prev.close) / 3);
  const pivots = {
    pp,
    r1: round2(2 * pp - prev.low),
    r2: round2(pp + (prev.high - prev.low)),
    r3: round2(prev.high + 2 * (pp - prev.low)),
    s1: round2(2 * pp - prev.high),
    s2: round2(pp - (prev.high - prev.low)),
    s3: round2(prev.low - 2 * (prev.high - pp)),
  };

  // Fibonacci (over visible swing window)
  const swingWindow = bars.slice(-60);
  const swingHigh = Math.max(...swingWindow.map((b) => b.high));
  const swingLow = Math.min(...swingWindow.map((b) => b.low));
  const diff = swingHigh - swingLow;
  const fibonacci = {
    swingHigh: round2(swingHigh),
    swingLow: round2(swingLow),
    r236: round2(swingHigh - 0.236 * diff),
    r382: round2(swingHigh - 0.382 * diff),
    r500: round2(swingHigh - 0.5 * diff),
    r618: round2(swingHigh - 0.618 * diff),
    r786: round2(swingHigh - 0.786 * diff),
    ext1272: round2(swingHigh + 0.272 * diff),
    ext1618: round2(swingHigh + 0.618 * diff),
  };

  // Support & Resistance clusters
  const supportLevels = Array.from(
    new Set([pivots.s1, pivots.s2, fibonacci.r618].filter((v): v is number => v !== null))
  ).sort((a, b) => b - a);
  const resistanceLevels = Array.from(
    new Set([pivots.r1, pivots.r2, round2(swingHigh)].filter((v): v is number => v !== null))
  ).sort((a, b) => a - b);

  // Price Action Structure
  const gapPct = ((last.open - prev.close) / prev.close) * 100;
  const gapType = gapPct > 1.0 ? 'GAP_UP' : gapPct < -1.0 ? 'GAP_DOWN' : 'NONE';
  const prev20High = Math.max(...bars.slice(-21, -1).map((b) => b.high));
  const prev20Low = Math.min(...bars.slice(-21, -1).map((b) => b.low));
  const breakout =
    last.close > prev20High ? 'BREAKOUT' : last.close < prev20Low ? 'BREAKDOWN' : 'NONE';

  let trendStructure: 'HH_HL' | 'LH_LL' | 'CONSOLIDATION' = 'CONSOLIDATION';
  if (bars.length >= 10) {
    const half1 = bars.slice(-10, -5);
    const half2 = bars.slice(-5);
    const h1 = Math.max(...half1.map((b) => b.high));
    const l1 = Math.min(...half1.map((b) => b.low));
    const h2 = Math.max(...half2.map((b) => b.high));
    const l2 = Math.min(...half2.map((b) => b.low));
    if (h2 > h1 && l2 > l1) trendStructure = 'HH_HL';
    else if (h2 < h1 && l2 < l1) trendStructure = 'LH_LL';
  }

  // Volume Profile (8 buckets)
  const bucketCount = 8;
  const vpStep = diff > 0 ? diff / bucketCount : 1;
  const volumeProfile = Array.from({ length: bucketCount }, (_, idx) => {
    const lowBound = swingLow + idx * vpStep;
    const highBound = lowBound + vpStep;
    const vol = swingWindow
      .filter((b) => b.close >= lowBound && (idx === bucketCount - 1 ? b.close <= highBound : b.close < highBound))
      .reduce((acc, b) => acc + b.volume, 0);
    return { priceLevel: round2((lowBound + highBound) / 2), volume: Math.round(vol) };
  });

  return {
    sma20,
    sma50,
    sma200,
    ema20,
    ema50,
    ema200,
    dema20,
    tema20,
    vwap,
    supertrend,
    ichimoku: { tenkan, kijun, senkouA, senkouB },
    psar,
    adx,
    macd: {
      macd: macdVal ?? null,
      signal: sigVal ?? null,
      histogram: macdObj.histogram[lastIdx] ?? null,
      crossover,
    },
    rsi14,
    stochRsi: { k: stochRsiK, d: stochRsiK },
    stochastic,
    cci20,
    roc12,
    williamsR14,
    momentum10,
    bollinger: {
      upper: bb.upper[lastIdx] ?? null,
      middle: bb.middle[lastIdx] ?? null,
      lower: bb.lower[lastIdx] ?? null,
    },
    atr14,
    keltner,
    donchian,
    stdDev20,
    obv: Math.round(obv),
    mfi14,
    cmf20,
    adLine: Math.round(adLine),
    relativeVolume,
    pivots,
    fibonacci,
    supportLevels,
    resistanceLevels,
    patterns: detectCandlestickPatterns(bars),
    structure: { gapType, breakout, trendStructure },
    volumeProfile,
  };
}
