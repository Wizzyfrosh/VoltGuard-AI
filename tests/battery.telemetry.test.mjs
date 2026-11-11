import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldPersistBatterySnapshot } from '../src/features/battery/battery.telemetry.ts';

function snapshot(overrides = {}) {
  return {
    platform: 'android',
    level: 0.8,
    state: 2,
    lowPowerMode: false,
    observedAt: '2026-11-11T10:00:00.000Z',
    source: 'native',
    capabilities: {
      batteryLevel: 'available', chargingState: 'available', lowPowerMode: 'available',
      temperature: 'available', voltage: 'available', batteryHealth: 'available',
      cycleCount: 'not-implemented', perAppPowerUsage: 'not-implemented',
      batteryTechnology: 'available', batteryCurrent: 'available',
      remainingCharge: 'available', energyCounter: 'available',
    },
    androidDiagnostics: null,
    ...overrides,
  };
}

test('persists the first usable snapshot', () => {
  assert.equal(shouldPersistBatterySnapshot(null, snapshot()), true);
});

test('does not persist unchanged telemetry before the sampling interval', () => {
  const previous = snapshot();
  const next = snapshot({ observedAt: '2026-11-11T10:01:00.000Z' });
  assert.equal(shouldPersistBatterySnapshot(previous, next), false);
});

test('persists a meaningful level change immediately', () => {
  assert.equal(shouldPersistBatterySnapshot(snapshot(), snapshot({
    level: 0.78,
    observedAt: '2026-11-11T10:00:10.000Z',
  })), true);
});

test('persists charging-state and low-power transitions immediately', () => {
  assert.equal(shouldPersistBatterySnapshot(snapshot(), snapshot({
    state: 3,
    observedAt: '2026-11-11T10:00:10.000Z',
  })), true);
  assert.equal(shouldPersistBatterySnapshot(snapshot(), snapshot({
    lowPowerMode: true,
    observedAt: '2026-11-11T10:00:10.000Z',
  })), true);
});

test('does not persist unavailable readings', () => {
  assert.equal(shouldPersistBatterySnapshot(null, snapshot({ source: 'unavailable' })), false);
});

test('persists after the configured sampling interval', () => {
  assert.equal(shouldPersistBatterySnapshot(snapshot(), snapshot({
    observedAt: '2026-11-11T10:05:00.000Z',
  })), true);
});
