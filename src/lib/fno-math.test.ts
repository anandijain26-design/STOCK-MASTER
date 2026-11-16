import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMaxPain,
  calculatePCR,
  classifyOIBuildup,
  computeBlackScholesGreeks,
} from './fno-math';

test('Black-Scholes Greeks satisfy call-put delta bounds', () => {
  const call = computeBlackScholesGreeks(25000, 25000, 7, 14, 'CALL');
  const put = computeBlackScholesGreeks(25000, 25000, 7, 14, 'PUT');
  assert.ok(call.delta > 0.45 && call.delta < 0.65);
  assert.ok(put.delta < -0.35 && put.delta > -0.55);
  assert.ok(Math.abs(call.delta - put.delta - 1) < 0.01);
  assert.ok(call.theoreticalPrice > 0 && put.theoreticalPrice > 0);
});

test('PCR and Max Pain compute deterministic strike targets', () => {
  const rows = [
    { strike: 24900, callOi: 100000, putOi: 450000 },
    { strike: 25000, callOi: 300000, putOi: 350000 },
    { strike: 25100, callOi: 500000, putOi: 120000 },
  ];
  assert.equal(calculatePCR(rows), 1.02);
  assert.equal(calculateMaxPain(rows), 25000);
});

test('OI buildup classifies all 4 derivative regimes', () => {
  assert.equal(classifyOIBuildup(1.2, 4.5), 'LONG_BUILDUP');
  assert.equal(classifyOIBuildup(-1.1, 3.2), 'SHORT_BUILDUP');
  assert.equal(classifyOIBuildup(0.9, -2.5), 'SHORT_COVERING');
  assert.equal(classifyOIBuildup(-0.8, -3.1), 'LONG_UNWINDING');
});
