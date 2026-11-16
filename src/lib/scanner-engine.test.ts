import test from 'node:test';
import assert from 'node:assert/strict';
import { PREBUILT_SCANS, runScanner, ScannableStock } from './scanner-engine';

const SAMPLE_STOCKS: ScannableStock[] = [
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd',
    sector: 'Energy',
    marketCapCategory: 'Large Cap',
    isFno: true,
    price: 1340,
    changePercent: 1.8,
    volume: 15000000,
    relativeVolume: 2.1,
    rsi14: 64,
    ema20: 1310,
    ema50: 1290,
    ema200: 1250,
    sma50: 1295,
    sma200: 1245,
    macd: 12.5,
    macdSignal: 9.1,
    macdCrossover: 'BULLISH',
    supertrendSignal: 'BULLISH',
    breakout: 'BREAKOUT',
    near52WHigh: true,
    near52WLow: false,
    patterns: ['Bullish Engulfing'],
    peRatio: 28.4,
    roe: 9.8,
    roce: 10.4,
    debtToEquity: 0.41,
    profitGrowth: 11.2,
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys Ltd',
    sector: 'IT',
    marketCapCategory: 'Large Cap',
    isFno: true,
    price: 1810,
    changePercent: -1.4,
    volume: 6000000,
    relativeVolume: 0.9,
    rsi14: 28,
    ema20: 1840,
    ema50: 1860,
    ema200: 1750,
    sma50: 1855,
    sma200: 1740,
    macd: -6.2,
    macdSignal: -2.1,
    macdCrossover: 'BEARISH',
    supertrendSignal: 'BEARISH',
    breakout: 'NONE',
    near52WHigh: false,
    near52WLow: false,
    patterns: [],
    peRatio: 26.2,
    roe: 31.8,
    roce: 39.2,
    debtToEquity: 0.09,
    profitGrowth: 8.5,
  },
];

test('custom multi-condition scanner filters accurately', () => {
  const results = runScanner(SAMPLE_STOCKS, [
    { field: 'rsi14', operator: '>', compareTo: 'VALUE', value: 55 },
    { field: 'price', operator: '>', compareTo: 'ema50' },
    { field: 'relativeVolume', operator: '>', compareTo: 'VALUE', value: 2.0 },
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].symbol, 'RELIANCE');
});

test('prebuilt oversold scan catches RSI < 30', () => {
  const oversold = PREBUILT_SCANS.find((s) => s.id === 'rsi_oversold')!;
  const results = runScanner(SAMPLE_STOCKS, oversold.conditions, oversold.specialFilter);
  assert.equal(results.length, 1);
  assert.equal(results[0].symbol, 'INFY');
});

test('prebuilt strong fundamentals scan catches high ROE & low debt', () => {
  const fundScan = PREBUILT_SCANS.find((s) => s.id === 'high_roe_low_debt')!;
  const results = runScanner(SAMPLE_STOCKS, fundScan.conditions, fundScan.specialFilter);
  assert.equal(results.length, 1);
  assert.equal(results[0].symbol, 'INFY');
});
