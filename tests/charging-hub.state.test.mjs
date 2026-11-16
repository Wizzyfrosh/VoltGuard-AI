import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChargingHubState } from '../src/features/battery/charging-hub.state.ts';

test('reports active charging from Expo battery state', () => {
  assert.deepEqual(resolveChargingHubState(2, null, null), {
    label: 'Charging', connected: true, activelyCharging: true, fullyCharged: false,
  });
});

test('reports a full battery as connected only when native power source confirms it', () => {
  assert.deepEqual(resolveChargingHubState(3, 'full', true), {
    label: 'Fully charged', connected: true, activelyCharging: false, fullyCharged: true,
  });
  assert.deepEqual(resolveChargingHubState(3, 'full', false), {
    label: 'Fully charged', connected: false, activelyCharging: false, fullyCharged: true,
  });
});

test('native discharging status overrides a stale platform charging state', () => {
  assert.deepEqual(resolveChargingHubState(2, 'discharging', false), {
    label: 'Not charging', connected: false, activelyCharging: false, fullyCharged: false,
  });
});

test('uses native charging state when the platform state is unknown', () => {
  assert.deepEqual(resolveChargingHubState(0, 'charging', true), {
    label: 'Charging', connected: true, activelyCharging: true, fullyCharged: false,
  });
});

test('keeps unknown state unavailable', () => {
  assert.deepEqual(resolveChargingHubState(0, 'unknown', null), {
    label: 'Status unavailable', connected: false, activelyCharging: false, fullyCharged: false,
  });
});

test('uses platform unplugged state when native status is unavailable', () => {
  assert.deepEqual(resolveChargingHubState(1, null, null), {
    label: 'Not charging', connected: false, activelyCharging: false, fullyCharged: false,
  });
});
