import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatteryLevel, isKnownBatteryState } from '../src/features/battery/battery.normalization.ts';

test('accepts battery levels at both valid boundaries', () => {
  assert.equal(normalizeBatteryLevel(0), 0);
  assert.equal(normalizeBatteryLevel(1), 1);
});

test('preserves valid fractional battery levels', () => {
  assert.equal(normalizeBatteryLevel(0.42), 0.42);
  assert.equal(normalizeBatteryLevel(0.995), 0.995);
});

test('rejects unsupported and invalid battery levels', () => {
  assert.equal(normalizeBatteryLevel(-1), null);
  assert.equal(normalizeBatteryLevel(1.01), null);
  assert.equal(normalizeBatteryLevel(Number.NaN), null);
  assert.equal(normalizeBatteryLevel(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeBatteryLevel(Number.NEGATIVE_INFINITY), null);
});

test('distinguishes a known battery state from the unknown sentinel', () => {
  assert.equal(isKnownBatteryState('charging', 'unknown'), true);
  assert.equal(isKnownBatteryState('unknown', 'unknown'), false);
});
