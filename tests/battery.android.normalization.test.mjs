import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAndroidBatteryDiagnostics } from '../src/features/battery/battery.android.normalization.ts';

test('normalizes Android temperature tenths of a degree to Celsius', () => {
  const result = normalizeAndroidBatteryDiagnostics({ temperatureTenthsCelsius: 347 });
  assert.equal(result.temperatureCelsius, 34.7);
});

test('preserves valid voltage, signed current and capacity', () => {
  const result = normalizeAndroidBatteryDiagnostics({
    voltageMilliVolts: 4180,
    currentNowMicroAmps: -325000,
    currentAverageMicroAmps: -290000,
    capacityPercent: 72,
  });
  assert.equal(result.voltageMilliVolts, 4180);
  assert.equal(result.currentNowMicroAmps, -325000);
  assert.equal(result.currentAverageMicroAmps, -290000);
  assert.equal(result.capacityPercent, 72);
});

test('rejects unsupported and out-of-range hardware values', () => {
  const result = normalizeAndroidBatteryDiagnostics({
    voltageMilliVolts: -1,
    temperatureTenthsCelsius: 99999,
    capacityPercent: 140,
    currentNowMicroAmps: Number.NaN,
    chargeCounterMicroAmpHours: -1,
    energyCounterNanoWattHours: -1,
    cycleCount: -1,
  });
  assert.equal(result.voltageMilliVolts, null);
  assert.equal(result.temperatureCelsius, null);
  assert.equal(result.capacityPercent, null);
  assert.equal(result.currentNowMicroAmps, null);
  assert.equal(result.chargeCounterMicroAmpHours, null);
  assert.equal(result.energyCounterNanoWattHours, null);
  assert.equal(result.cycleCount, null);
});

test('preserves a valid Android-reported battery cycle count', () => {
  const result = normalizeAndroidBatteryDiagnostics({ apiLevel: 34, cycleCount: 412 });
  assert.equal(result.cycleCount, 412);
});

test('returns null for missing native module data', () => {
  assert.equal(normalizeAndroidBatteryDiagnostics(null), null);
  assert.equal(normalizeAndroidBatteryDiagnostics(undefined), null);
});
