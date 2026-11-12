import test from 'node:test';
import assert from 'node:assert/strict';
import { hasBatteryHistoryConsent } from '../src/features/battery/battery.history-consent.ts';

test('allows history only for the exact persisted opt-in value', () => {
  assert.equal(hasBatteryHistoryConsent('true'), true);
});

test('fails closed for missing, disabled, or malformed preference values', () => {
  for (const value of [null, undefined, 'false', '', 'TRUE', '1', 'yes']) {
    assert.equal(hasBatteryHistoryConsent(value), false);
  }
});
