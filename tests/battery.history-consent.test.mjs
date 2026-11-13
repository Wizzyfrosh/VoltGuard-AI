import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBatteryHistoryCutoff,
  hasBatteryHistoryConsent,
  normalizeBatteryHistoryLimit,
  runBatteryHistoryMutation,
} from '../src/features/battery/battery.history-consent.ts';

test('allows history only for the exact persisted opt-in value', () => {
  assert.equal(hasBatteryHistoryConsent('true'), true);
});

test('fails closed for missing, disabled, or malformed preference values', () => {
  for (const value of [null, undefined, 'false', '', 'TRUE', '1', 'yes']) {
    assert.equal(hasBatteryHistoryConsent(value), false);
  }
});

test('normalizes finite query limits and falls back for non-finite input', () => {
  assert.equal(normalizeBatteryHistoryLimit(12.9, 100, 1000), 12);
  assert.equal(normalizeBatteryHistoryLimit(0, 100, 1000), 1);
  assert.equal(normalizeBatteryHistoryLimit(-5, 100, 1000), 1);
  assert.equal(normalizeBatteryHistoryLimit(5000, 100, 1000), 1000);
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(normalizeBatteryHistoryLimit(value, 100, 1000), 100);
  }
});

test('computes the 30-day retention cutoff deterministically', () => {
  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(
    getBatteryHistoryCutoff(now),
    '2026-10-14T12:00:00.000Z',
  );
});

test('serializes mutations and continues after a failed operation', async () => {
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });

  const first = runBatteryHistoryMutation(async () => {
    order.push('first-start');
    await firstGate;
    order.push('first-end');
  });
  const second = runBatteryHistoryMutation(async () => {
    order.push('second');
  });

  await Promise.resolve();
  assert.deepEqual(order, ['first-start']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second']);

  await assert.rejects(
    runBatteryHistoryMutation(async () => { throw new Error('expected failure'); }),
    /expected failure/,
  );
  await runBatteryHistoryMutation(async () => { order.push('after-failure'); });
  assert.equal(order.at(-1), 'after-failure');
});
