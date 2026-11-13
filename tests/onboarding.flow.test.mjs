import test from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingDestination } from '../src/features/onboarding/onboarding.flow.ts';

test('routes first launch to onboarding', () => {
  assert.equal(getOnboardingDestination(false), '/onboarding');
});

test('routes completed onboarding directly to Home', () => {
  assert.equal(getOnboardingDestination(true), '/(tabs)/dashboard');
});
