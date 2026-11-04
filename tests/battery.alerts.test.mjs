import test from 'node:test';
import assert from 'node:assert/strict';

function isValidThreshold(value) {
  return Number.isInteger(value) && value >= 50 && value <= 100;
}

test('accepts supported charging alert thresholds', () => {
  for (const value of [50, 70, 80, 85, 90, 100]) assert.equal(isValidThreshold(value), true);
});

test('rejects invalid charging alert thresholds', () => {
  for (const value of [0, 49, 101, 80.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(isValidThreshold(value), false);
});
