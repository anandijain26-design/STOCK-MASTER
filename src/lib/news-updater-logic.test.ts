import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackDailyNewsDigest,
  buildNewsArticleKey,
  extractMatchedSymbol,
  formatNextIstSyncLabel,
  getIstDateKey,
  shouldRunDailyNewsSync,
} from './news-updater-logic';

test('getIstDateKey resolves YYYY-MM-DD in Asia/Kolkata', () => {
  // 2026-11-15T20:00:00Z is 2026-11-16 01:30 IST (next day)
  const key = getIstDateKey(new Date('2026-11-15T20:00:00Z'));
  assert.equal(key, '2026-11-16');
});

test('extractMatchedSymbol finds NSE tickers while ignoring common stopwords', () => {
  assert.equal(
    extractMatchedSymbol('IRFC shares rally 5% after railway ministry capex update', ''),
    'IRFC'
  );
  assert.equal(
    extractMatchedSymbol('Reliance Industries expands green hydrogen capacity in Jamnagar', ''),
    'RELIANCE'
  );
  assert.equal(
    extractMatchedSymbol('SEBI issues new circular for NSE and BSE retail investors', ''),
    null
  );
});

test('buildNewsArticleKey creates deterministic keys', () => {
  const k1 = buildNewsArticleKey('NIFTY hits fresh milestone', 'https://example.com/news/1');
  const k2 = buildNewsArticleKey('NIFTY hits fresh milestone', 'https://example.com/news/1');
  const k3 = buildNewsArticleKey('NIFTY hits fresh milestone', 'https://example.com/news/2');
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
});

test('shouldRunDailyNewsSync triggers on day change, empty items, or staleness', () => {
  const now = new Date('2026-11-16T06:00:00Z'); // 11:30 IST on 2026-11-16
  assert.equal(
    shouldRunDailyNewsSync({ digestDate: null, lastSyncedAt: null, now }),
    true
  );
  assert.equal(
    shouldRunDailyNewsSync({
      digestDate: '2026-11-15',
      lastSyncedAt: new Date('2026-11-15T23:00:00Z'),
      articleCount: 25,
      now,
    }),
    true
  );
  assert.equal(
    shouldRunDailyNewsSync({
      digestDate: '2026-11-16',
      lastSyncedAt: new Date('2026-11-16T04:00:00Z'), // 120 mins ago
      articleCount: 25,
      now,
      staleMinutes: 60,
    }),
    true
  );
  assert.equal(
    shouldRunDailyNewsSync({
      digestDate: '2026-11-16',
      lastSyncedAt: new Date('2026-11-16T05:45:00Z'), // 15 mins ago
      articleCount: 25,
      now,
      staleMinutes: 60,
    }),
    false
  );
});

test('formatNextIstSyncLabel and fallback digest produce valid output', () => {
  const label = formatNextIstSyncLabel(new Date('2026-11-16T05:00:00Z')); // 10:30 IST
  assert.match(label, /12:30 PM IST/);

  const digest = buildFallbackDailyNewsDigest(
    [{ title: 'TCS wins cloud deal', source: 'ET', category: 'Markets', symbol: 'TCS' }],
    'en',
    '2026-11-16'
  );
  assert.ok(digest.includes('TCS wins cloud deal'));
});
