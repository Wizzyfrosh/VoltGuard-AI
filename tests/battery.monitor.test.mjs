import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBatteryMonitorReport, estimateBatteryTime } from '../src/features/battery/battery.monitor.ts';

const now = Date.UTC(2026, 10, 16, 12, 0, 0);
const at = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();
const sample = (minutesAgo, level, state = 1) => ({ observedAt: at(minutesAgo), level, state });

test('estimates discharge time only from a recent contiguous same-state window', () => {
  const result = estimateBatteryTime([
    sample(60, 0.8), sample(45, 0.75), sample(30, 0.7), sample(15, 0.65), sample(0, 0.6),
  ], now);
  assert.equal(result.direction, 'discharging');
  assert.equal(result.minutesRemaining, 180);
  assert.ok(result.percentPerHour > 0);
  assert.equal(result.sampleCount, 5);
});

test('estimates charging time from a positive charging trend', () => {
  const result = estimateBatteryTime([
    sample(60, 0.5, 2), sample(45, 0.55, 2), sample(30, 0.6, 2), sample(15, 0.65, 2), sample(0, 0.7, 2),
  ], now);
  assert.equal(result.direction, 'charging');
  assert.equal(result.minutesRemaining, 180);
});

test('does not estimate from too few samples or a charging-state transition', () => {
  assert.equal(estimateBatteryTime([sample(30, 0.8), sample(15, 0.7), sample(0, 0.6)], now).minutesRemaining, null);
  assert.equal(estimateBatteryTime([
    sample(60, 0.8), sample(45, 0.75), sample(30, 0.7), sample(15, 0.65), sample(0, 0.6, 2),
  ], now).minutesRemaining, null);
});

test('rejects duplicate or near-duplicate timestamps in a trend window', () => {
  const result = estimateBatteryTime([
    sample(30, 0.9), sample(29.5, 0.89), sample(15, 0.8), sample(0, 0.7),
  ], now);
  assert.equal(result.minutesRemaining, null);
});

test('does not bridge long gaps or use future/out-of-range observations', () => {
  const result = estimateBatteryTime([
    sample(240, 0.9), sample(225, 0.85), sample(10, 0.7), sample(0, 0.65),
  ], now);
  assert.equal(result.minutesRemaining, null);
});

test('monitor report computes ranges only from valid diagnostic values', () => {
  const report = buildBatteryMonitorReport(
    [sample(10, 0.8), sample(0, 0.75)],
    [
      { observedAt: at(20), temperatureCelsius: 30, voltageMilliVolts: 4000, currentNowMilliAmps: -500 },
      { observedAt: at(10), temperatureCelsius: 200, voltageMilliVolts: 0, currentNowMilliAmps: null },
      { observedAt: at(0), temperatureCelsius: 35, voltageMilliVolts: 4100, currentNowMilliAmps: 250 },
    ],
    now,
  );
  assert.deepEqual(report.temperature, { minimum: 30, maximum: 35, sampleCount: 2 });
  assert.deepEqual(report.voltage, { minimum: 4000, maximum: 4100, sampleCount: 2 });
  assert.deepEqual(report.current, { minimum: -500, maximum: 250, sampleCount: 2 });
  assert.equal(report.sampleCount, 2);
});
