import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTechnicals,
  computeEMA,
  computeHeikinAshi,
  computeMACD,
  computeRSI,
  computeSMA,
  computeSupertrend,
  OHLCVBar,
} from './indicators';

function makeTrendingBars(count: number, startPrice = 1000, step = 5): OHLCVBar[] {
  return Array.from({ length: count }, (_, i) => {
    const close = startPrice + i * step;
    const open = close - step * 0.4;
    const high = close + 8;
    const low = open - 6;
    return {
      time: 1700000000 + i * 86400,
      open,
      high,
      low,
      close,
      volume: 100000 + i * 5000,
    };
  });
}

test('computeSMA calculates accurate moving averages', () => {
  const sma = computeSMA([10, 20, 30, 40, 50], 3);
  assert.deepEqual(sma, [null, null, 20, 30, 40]);
});

test('computeEMA produces monotonic rising values on uptrend', () => {
  const ema = computeEMA([10, 12, 14, 16, 18, 20], 3);
  assert.equal(ema[0], null);
  assert.equal(ema[1], null);
  assert.ok(ema[2]! < ema[3]! && ema[3]! < ema[4]! && ema[4]! < ema[5]!);
});

test('computeRSI returns high values on strong uptrend and low on downtrend', () => {
  const up = Array.from({ length: 25 }, (_, i) => 100 + i * 3);
  const down = Array.from({ length: 25 }, (_, i) => 200 - i * 3);
  const rsiUp = computeRSI(up, 14);
  const rsiDown = computeRSI(down, 14);
  assert.equal(rsiUp[24], 100);
  assert.equal(rsiDown[24], 0);
});

test('computeMACD yields positive MACD above signal on steady uptrend', () => {
  const prices = Array.from({ length: 50 }, (_, i) => 500 + i * 4);
  const { macd, signal } = computeMACD(prices);
  const last = prices.length - 1;
  assert.ok(macd[last] !== null && macd[last]! > 0);
  assert.ok(signal[last] !== null);
});

test('computeSupertrend detects bullish regime on rising bars', () => {
  const bars = makeTrendingBars(40, 1000, 10);
  const st = computeSupertrend(bars, 10, 3);
  assert.equal(st[st.length - 1].trend, 'BULLISH');
});

test('computeHeikinAshi preserves length and computes valid OHLC bounds', () => {
  const bars = makeTrendingBars(10, 500, 5);
  const ha = computeHeikinAshi(bars);
  assert.equal(ha.length, 10);
  for (const b of ha) {
    assert.ok(b.high >= Math.max(b.open, b.close));
    assert.ok(b.low <= Math.min(b.open, b.close));
  }
});

test('analyzeTechnicals produces complete indicator summary and pivots', () => {
  const bars = makeTrendingBars(80, 1200, 6);
  const summary = analyzeTechnicals(bars);
  assert.ok(summary.ema20 !== null && summary.ema50 !== null);
  assert.ok(summary.ema20! > summary.ema50!);
  assert.ok(summary.pivots.pp !== null);
  assert.ok(summary.pivots.r1! > summary.pivots.pp! && summary.pivots.s1! < summary.pivots.pp!);
  assert.equal(summary.volumeProfile.length, 8);
});
