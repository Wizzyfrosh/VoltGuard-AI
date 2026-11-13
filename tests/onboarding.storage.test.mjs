import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getOnboardingDestination } from '../src/features/onboarding/onboarding.flow.ts';

test('onboarding uses the shared cross-platform preference adapter', async () => {
  const source = await readFile(
    new URL('../src/features/onboarding/onboarding.storage.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /onboarding_completed_v1/);
  assert.match(source, /getBatteryPreference\(ONBOARDING_COMPLETED_KEY\)/);
  assert.match(source, /setBatteryPreference\(ONBOARDING_COMPLETED_KEY, 'true'\)/);
  assert.match(source, /setBatteryPreference\(ONBOARDING_COMPLETED_KEY, 'false'\)/);
  assert.doesNotMatch(source, /battery_history_enabled/);
});

test('onboarding route decision sends first launch to onboarding', () => {
  assert.equal(getOnboardingDestination(false), '/onboarding');
});

test('onboarding route decision sends completed users to Home', () => {
  assert.equal(getOnboardingDestination(true), '/(tabs)/dashboard');
});
