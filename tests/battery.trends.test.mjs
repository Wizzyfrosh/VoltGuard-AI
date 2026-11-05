import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBatteryTrendReport } from '../src/features/battery/battery.trends.ts';

const now = Date.UTC(2026, 10, 5, 12, 0, 0);
const at = (dayOffset, hour, minute = 0) =>
  new Date(Date.UTC(2026, 10, 5 + dayOffset, hour, minute)).toISOString();
const sample = (observedAt, level, batteryState) => ({ observedAt, level, batteryState });

test('weekly report counts only observed charging gains and unplugged discharge', () => {
  const report = buildBatteryTrendReport([
    sample(at(-1, 8), 0.8, 1),
    sample(at(-1, 9), 0.7, 1),
    sample(at(-1, 10), 0.7, 2),
    sample(at(-1, 11), 0.9, 2),
  ], [], 'week', now);

  assert.equal(report.buckets.length, 7);
  assert.equal(report.dischargedPercent, 10);
  assert.equal(report.chargedPercent, 20);
  assert.equal(report.sampleCount, 4);
});

test('does not calculate a change across a charging-state transition', () => {
  const report = buildBatteryTrendReport([
    sample(at(-1, 8), 0.8, 1),
    sample(at(-1, 9), 0.9, 2),
    sample(at(-1, 10), 0.7, 1),
  ], [], 'week', now);

  assert.equal(report.chargedPercent, null);
  assert.equal(report.dischargedPercent, null);
});

test('ignores gaps longer than six hours and tiny intervals', () => {
  const report = buildBatteryTrendReport([
    sample(at(-2, 1), 0.9, 1),
    sample(at(-2, 1, 2), 0.8, 1),
    sample(at(-1, 10), 0.7, 1),
  ], [], 'week', now);

  assert.equal(report.dischargedPercent, null);
});

test('monthly report creates five weekly buckets for a 30-day window', () => {
  const report = buildBatteryTrendReport([], [], 'month', now);
  assert.equal(report.buckets.length, 5);
  assert.equal(report.period, 'month');
  assert.equal(report.sampleCount, 0);
  assert.equal(report.coverage, 'low');
  assert.match(report.explanation, /not enough saved readings/i);
});

test('summarizes completed charging sessions without counting incomplete sessions as completed', () => {
  const sessions = [
    {
      id: 1, startedAt: at(-1, 8), endedAt: at(-1, 9),
      startLevel: 0.4, endLevel: 0.8, status: 'completed', source: 'native',
    },
    {
      id: 2, startedAt: at(-1, 11), endedAt: null,
      startLevel: 0.5, endLevel: 0.6, status: 'charging', source: 'native',
    },
  ];
  const report = buildBatteryTrendReport([], sessions, 'week', now);

  assert.equal(report.chargingSessionCount, 2);
  assert.equal(report.completedSessionCount, 1);
  assert.equal(report.averageSessionGainPercent, 40);
  assert.equal(report.totalCompletedChargingMinutes, 60);
});

test('ignores samples outside the requested 30-day window', () => {
  const report = buildBatteryTrendReport([
    sample(at(-31, 8), 0.9, 1),
    sample(at(-29, 8), 0.8, 1),
    sample(at(-29, 9), 0.7, 1),
  ], [], 'month', now);

  assert.equal(report.sampleCount, 2);
  assert.equal(report.dischargedPercent, 10);
});
