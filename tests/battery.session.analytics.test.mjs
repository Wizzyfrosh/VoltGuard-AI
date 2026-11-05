import test from 'node:test';
import assert from 'node:assert/strict';
import { compareChargingSessions, getChargingSessionRate } from '../src/features/battery/battery.session.analytics.ts';

const now = Date.UTC(2026, 10, 5, 12);
const date = (offsetHours) => new Date(now + offsetHours * 3600000).toISOString();
const session = (id, startOffset, endOffset, startLevel, endLevel, status = 'completed') => ({
  id,
  startedAt: date(startOffset),
  endedAt: endOffset === null ? null : date(endOffset),
  startLevel,
  endLevel,
  status,
  source: 'native',
});

test('compares completed sessions in adjacent seven-day windows', () => {
  const sessions = [
    session(1, -24, -22, 0.2, 0.8),
    session(2, -8 * 24, -8 * 24 + 2, 0.4, 0.7),
  ];
  const result = compareChargingSessions(sessions, now);

  assert.equal(result.current.sessionCount, 1);
  assert.equal(result.current.averageGainPercent, 60);
  assert.equal(result.previous.sessionCount, 1);
  assert.equal(result.previous.averageGainPercent, 30);
  assert.equal(result.gainChangePercentPoints, 30);
});

test('does not use incomplete, invalid or longer-than-six-hour sessions in rate summaries', () => {
  const sessions = [
    session(1, -24, -23, 0.3, 0.8),
    session(2, -20, null, 0.4, 0.7, 'charging'),
    session(3, -18, -10, 0.2, 0.9),
    session(4, -6, -5, 0.8, 0.5),
  ];
  const result = compareChargingSessions(sessions, now);

  assert.equal(result.current.sessionCount, 1);
  assert.equal(result.current.averageGainPercent, 50);
});

test('calculates an observed level-change rate for a bounded completed session', () => {
  const item = session(1, -3, -1, 0.2, 0.8);
  assert.equal(getChargingSessionRate(item), 60);
});

test('returns no rate for incomplete, invalid or sparse sessions', () => {
  assert.equal(getChargingSessionRate(session(1, -2, null, 0.2, 0.8, 'charging')), null);
  assert.equal(getChargingSessionRate(session(2, -8, 0, 0.2, 0.8)), null);
  assert.equal(getChargingSessionRate(session(3, -2, -1, 0.9, 0.2)), null);
  assert.equal(getChargingSessionRate(session(4, -2, -1, 1.2, 1.3)), null);
});

test('requires observations in both periods for a comparison delta', () => {
  const result = compareChargingSessions([session(1, -24, -23, 0.2, 0.6)], now);
  assert.equal(result.gainChangePercentPoints, null);
  assert.match(result.explanation, /needs at least one completed session/i);
});
