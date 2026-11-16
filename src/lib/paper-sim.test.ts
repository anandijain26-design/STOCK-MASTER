import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCharges,
  calculateRequiredMargin,
  computeNextSimTick,
  computePaperAnalytics,
  evaluateBracketExit,
  shouldExecutePendingOrder,
} from './paper-sim.ts';

test('calculateCharges differentiates CNC delivery vs MIS intraday', () => {
  const cncBuy = calculateCharges({ side: 'BUY', productType: 'CNC', orderValue: 100000 });
  assert.equal(cncBuy.brokerage, 0);
  assert.equal(cncBuy.stt, 100);
  assert.equal(cncBuy.stampDuty, 15);
  assert.ok(cncBuy.totalCharges > 115);

  const misBuy = calculateCharges({ side: 'BUY', productType: 'MIS', orderValue: 100000 });
  assert.equal(misBuy.brokerage, 20);
  assert.equal(misBuy.stt, 0); // STT on MIS is sell-side only
  assert.equal(misBuy.stampDuty, 3);
});

test('calculateRequiredMargin applies 5x leverage for MIS', () => {
  assert.equal(
    calculateRequiredMargin({ side: 'BUY', productType: 'CNC', orderValue: 50000 }),
    50000
  );
  assert.equal(
    calculateRequiredMargin({ side: 'BUY', productType: 'MIS', orderValue: 50000 }),
    10000
  );
  assert.equal(
    calculateRequiredMargin({
      side: 'SELL',
      productType: 'CNC',
      orderValue: 50000,
      isClosingExistingLong: true,
    }),
    0
  );
});

test('shouldExecutePendingOrder evaluates LIMIT and SL rules accurately', () => {
  assert.equal(
    shouldExecutePendingOrder({ side: 'BUY', orderType: 'LIMIT', triggerPrice: 1300, currentPrice: 1295 }),
    true
  );
  assert.equal(
    shouldExecutePendingOrder({ side: 'BUY', orderType: 'LIMIT', triggerPrice: 1300, currentPrice: 1310 }),
    false
  );
  assert.equal(
    shouldExecutePendingOrder({ side: 'SELL', orderType: 'SL', triggerPrice: 1250, currentPrice: 1248 }),
    true
  );
  assert.equal(
    shouldExecutePendingOrder({ side: 'SELL', orderType: 'SL', triggerPrice: 1250, currentPrice: 1265 }),
    false
  );
});

test('evaluateBracketExit detects STOP_LOSS and TARGET', () => {
  assert.equal(evaluateBracketExit({ stopLoss: 1280, target: 1400, currentPrice: 1279 }), 'STOP_LOSS');
  assert.equal(evaluateBracketExit({ stopLoss: 1280, target: 1400, currentPrice: 1405 }), 'TARGET');
  assert.equal(evaluateBracketExit({ stopLoss: 1280, target: 1400, currentPrice: 1330 }), null);
});

test('computeNextSimTick stays bounded and snaps to 0.05 tick size', () => {
  let price = 1400;
  for (let i = 1; i <= 25; i++) {
    price = computeNextSimTick({ currentPrice: price, anchorPrice: 1400, atr: 22, step: i });
    assert.ok(price > 1200 && price < 1600);
    const rem = Math.round((price * 20) % 1);
    assert.equal(rem, 0);
  }
});

test('computePaperAnalytics summarizes win rate and profit factor', () => {
  const stats = computePaperAnalytics([
    { side: 'BUY', realizedPnl: 0 },
    { side: 'SELL', realizedPnl: 1200 },
    { side: 'SELL', realizedPnl: -400 },
    { side: 'SELL', realizedPnl: 800 },
  ]);
  assert.equal(stats.totalTrades, 4);
  assert.equal(stats.closedTrades, 3);
  assert.equal(stats.winningTrades, 2);
  assert.equal(stats.losingTrades, 1);
  assert.equal(stats.winRatePct, 66.7);
  assert.equal(stats.profitFactor, 5);
  assert.equal(stats.netRealizedPnl, 1600);
});
