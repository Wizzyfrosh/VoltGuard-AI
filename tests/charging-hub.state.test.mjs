import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChargingHubState } from '../src/features/battery/charging-hub.state.ts';

test('reports active charging from platform charging state', () => {
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

test('does not let an unplugged platform state inherit a stale native charging state', () => {
  assert.deepEqual(resolveChargingHubState(1, 'discharging', false), {
    label: 'Not charging', connected: false, activelyCharging: false, fullyCharged: false,
  });
});

test('uses native charging state when the cross-platform state is unavailable', () => {
  assert.deepEqual(resolveChargingHubState(0, 'charging', true), {
    label: 'Charging', connected: true, activelyCharging: true, fullyCharged: false,
  });
});

test('keeps unsupported or unknown states unavailable', () => {
  assert.deepEqual(resolveChargingHubState(0, 'unknown', null), {
    label: 'Status unavailable', connected: false, activelyCharging: false, fullyCharged: false,
  });
});
