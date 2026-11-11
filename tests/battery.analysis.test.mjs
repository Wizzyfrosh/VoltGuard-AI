import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatteryDrain, explainBatteryHealth } from '../src/features/battery/battery.analysis.ts';

const sample = (minute, level, isUnplugged = true) => ({
  observedAt: new Date(Date.UTC(2026, 10, 5, 8, minute)).toISOString(),
  level,
  isUnplugged,
});

test('requires at least two valid observations', () => {
  const result = analyzeBatteryDrain([sample(0, 0.8)]);
  assert.equal(result.status, 'insufficient-data');
  assert.equal(result.drainPercentPerHour, null);
});

test('calculates unplugged device-level drain rate from elapsed time', () => {
  const result = analyzeBatteryDrain([sample(0, 0.9), sample(30, 0.85), sample(60, 0.8)]);
  assert.equal(result.drainPercentPerHour, 10);
  assert.equal(result.status, 'elevated');
});

test('excludes intervals containing charging observations', () => {
  const result = analyzeBatteryDrain([
    sample(0, 0.8),
    sample(20, 0.9, false),
    sample(40, 0.7),
  ]);
  assert.equal(result.status, 'insufficient-data');
});

test('does not bridge a charging interval when only one later unplugged sample exists', () => {
  const result = analyzeBatteryDrain([
    sample(0, 0.9),
    sample(20, 0.8, false),
    sample(40, 0.7),
  ]);
  assert.equal(result.status, 'insufficient-data');
  assert.equal(result.drainPercentPerHour, null);
});

test('does not calculate across sparse gaps greater than six hours', () => {
  const result = analyzeBatteryDrain([
    { observedAt: '2026-11-05T00:00:00.000Z', level: 0.9, isUnplugged: true },
    { observedAt: '2026-11-05T07:00:00.000Z', level: 0.7, isUnplugged: true },
  ]);
  assert.equal(result.status, 'insufficient-data');
});

test('distinguishes OS-reported good health from capacity wear', () => {
  const result = explainBatteryHealth('GOOD');
  assert.equal(result.condition, 'reported-good');
  assert.equal(result.estimatedWearPercent, null);
  assert.match(result.message, /not a measured battery-capacity/i);
});

test('unknown OS health remains unknown rather than being guessed', () => {
  const result = explainBatteryHealth(null);
  assert.equal(result.condition, 'unknown');
  assert.equal(result.estimatedWearPercent, null);
});

test('drain coverage reflects the selected window rather than unrelated history', () => {
  const result = analyzeBatteryDrain([
    ...Array.from({ length: 20 }, (_, index) => ({
      observedAt: new Date(Date.UTC(2026, 10, 4, 0, index * 5)).toISOString(),
      level: 0.9 - index * 0.001,
      isUnplugged: false,
    })),
    { observedAt: '2026-11-05T08:00:00.000Z', level: 0.9, isUnplugged: true },
    { observedAt: '2026-11-05T08:30:00.000Z', level: 0.85, isUnplugged: true },
  ]);
  assert.equal(result.coverage, 'low');
  assert.equal(result.drainPercentPerHour, 10);
});

test('linear unplugged window scan stops at charging boundaries', () => {
  const result = analyzeBatteryDrain([
    sample(0, 0.9),
    sample(20, 0.8),
    sample(30, 0.85, false),
    sample(40, 0.7),
  ]);
  // The valid 20-minute unplugged segment is retained; the later single
  // sample is not joined to it across the charging observation.
  assert.equal(result.status, 'rapid');
  assert.equal(result.drainPercentPerHour, 30);
});
