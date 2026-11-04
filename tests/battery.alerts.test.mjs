import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidBatteryAlertThreshold } from '../src/features/battery/battery.alerts.validation.ts';

test('accepts supported charging alert thresholds', () => {
  for (const value of [50, 70, 80, 85, 90, 100]) assert.equal(isValidBatteryAlertThreshold(value), true);
});

test('rejects invalid charging alert thresholds', () => {
  for (const value of [0, 49, 101, 80.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(isValidBatteryAlertThreshold(value), false);
});
