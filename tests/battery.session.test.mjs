import test from 'node:test';
import assert from 'node:assert/strict';
import { getChargingTransition } from '../src/features/battery/battery.session.ts';

test('starts a session when charging is first observed', () => {
  assert.equal(getChargingTransition(true, false, false), 'start');
});

test('updates an existing session while charging remains active', () => {
  assert.equal(getChargingTransition(true, false, true), 'update');
});

test('finishes an active session when unplugged is observed', () => {
  assert.equal(getChargingTransition(false, true, true), 'finish');
});

test('does not create a session for an unknown or idle state', () => {
  assert.equal(getChargingTransition(false, false, false), 'none');
  assert.equal(getChargingTransition(false, false, true), 'none');
  assert.equal(getChargingTransition(false, true, false), 'none');
});
