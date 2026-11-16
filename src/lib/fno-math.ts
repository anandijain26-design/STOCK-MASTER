export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  theoreticalPrice: number;
}

export interface OptionStrikeRow {
  strike: number;
  callLtp: number;
  callIv: number;
  callOi: number;
  callChangeInOi: number;
  callVolume: number;
  callGreeks: OptionGreeks;
  putLtp: number;
  putIv: number;
  putOi: number;
  putChangeInOi: number;
  putVolume: number;
  putGreeks: OptionGreeks;
}

export type BuildupType =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_UNWINDING'
  | 'NEUTRAL';

function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return 0.5 * (1 + sign * y);
}

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function computeBlackScholesGreeks(
  spot: number,
  strike: number,
  daysToExpiry: number,
  ivPercent: number,
  optionType: 'CALL' | 'PUT',
  riskFreeRate = 0.068 // RBI repo-anchored 6.8% India risk-free benchmark
): OptionGreeks {
  const T = Math.max(daysToExpiry, 0.25) / 365;
  const sigma = Math.max(ivPercent / 100, 0.05);
  const sqrtT = Math.sqrt(T);

  const d1 =
    (Math.log(spot / strike) + (riskFreeRate + 0.5 * sigma * sigma) * T) /
    (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const pdfD1 = normalPdf(d1);
  const cdfD1 = normalCdf(d1);
  const cdfD2 = normalCdf(d2);

  let price: number;
  let delta: number;
  let theta: number;

  if (optionType === 'CALL') {
    price = spot * cdfD1 - strike * Math.exp(-riskFreeRate * T) * cdfD2;
    delta = cdfD1;
    theta =
      (-spot * pdfD1 * sigma) / (2 * sqrtT) -
      riskFreeRate * strike * Math.exp(-riskFreeRate * T) * cdfD2;
  } else {
    price =
      strike * Math.exp(-riskFreeRate * T) * normalCdf(-d2) -
      spot * normalCdf(-d1);
    delta = cdfD1 - 1;
    theta =
      (-spot * pdfD1 * sigma) / (2 * sqrtT) +
      riskFreeRate * strike * Math.exp(-riskFreeRate * T) * normalCdf(-d2);
  }

  const gamma = pdfD1 / (spot * sigma * sqrtT);
  const vega = (spot * pdfD1 * sqrtT) / 100;

  return {
    delta: Math.round(delta * 1000) / 1000,
    gamma: Math.round(gamma * 100000) / 100000,
    theta: Math.round((theta / 365) * 100) / 100,
    vega: Math.round(vega * 100) / 100,
    theoreticalPrice: Math.max(0.05, Math.round(price * 100) / 100),
  };
}

export function calculatePCR(rows: Array<{ callOi: number; putOi: number }>): number {
  const totalCalls = rows.reduce((acc, r) => acc + r.callOi, 0);
  const totalPuts = rows.reduce((acc, r) => acc + r.putOi, 0);
  if (totalCalls === 0) return 0;
  return Math.round((totalPuts / totalCalls) * 100) / 100;
}

export function calculateMaxPain(
  rows: Array<{ strike: number; callOi: number; putOi: number }>
): number | null {
  if (rows.length === 0) return null;
  let minPain = Infinity;
  let bestStrike = rows[0].strike;

  for (const candidate of rows) {
    let totalPain = 0;
    for (const row of rows) {
      if (candidate.strike > row.strike) {
        totalPain += (candidate.strike - row.strike) * row.callOi;
      } else if (candidate.strike < row.strike) {
        totalPain += (row.strike - candidate.strike) * row.putOi;
      }
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      bestStrike = candidate.strike;
    }
  }
  return bestStrike;
}

export function classifyOIBuildup(priceChangePct: number, oiChangePct: number): BuildupType {
  if (priceChangePct > 0.1 && oiChangePct > 0.5) return 'LONG_BUILDUP';
  if (priceChangePct < -0.1 && oiChangePct > 0.5) return 'SHORT_BUILDUP';
  if (priceChangePct > 0.1 && oiChangePct < -0.5) return 'SHORT_COVERING';
  if (priceChangePct < -0.1 && oiChangePct < -0.5) return 'LONG_UNWINDING';
  return 'NEUTRAL';
}
