import test from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingDestination } from '../src/features/onboarding/onboarding.flow.ts';

test('onboarding completion has a stable versioned storage key', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(
    new URL('../src/features/onboarding/onboarding.storage.ts', import.meta.url),
    'utf8',
  ));
  assert.match(source, /onboarding_completed_v1/);
  assert.match(source, /Platform\.OS === 'web'/);
  assert.match(source, /localStorage\?\.getItem/);
  assert.match(source, /setItem\(ONBOARDING_COMPLETED_KEY, value\)/);
});

test('onboarding route decision remains independent of platform storage', () => {
  assert.equal(getOnboardingDestination(false), '/onboarding');
  assert.equal(getOnboardingDestination(true), '/(tabs)/dashboard');
});
