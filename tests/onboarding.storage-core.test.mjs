import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingStorage } from '../src/features/onboarding/onboarding.storage-core.ts';

function createMemoryPreferences(initial = {}) {
  const values = new Map(Object.entries(initial));
  const reads = [];
  const writes = [];
  return {
    values,
    reads,
    writes,
    async read(key) {
      reads.push(key);
      return values.has(key) ? values.get(key) : null;
    },
    async write(key, value) {
      writes.push([key, value]);
      values.set(key, value);
    },
  };
}

test('first launch is incomplete when no preference exists', async () => {
  const preferences = createMemoryPreferences();
  const storage = createOnboardingStorage(preferences.read, preferences.write);
  assert.equal(await storage.hasCompletedOnboarding(), false);
  assert.deepEqual(preferences.reads, ['onboarding_completed_v1']);
});

test('completion persists and returning launch reads completed state', async () => {
  const preferences = createMemoryPreferences();
  const storage = createOnboardingStorage(preferences.read, preferences.write);
  await storage.completeOnboarding();
  assert.equal(await storage.hasCompletedOnboarding(), true);
  assert.deepEqual(preferences.writes, [['onboarding_completed_v1', 'true']]);
});

test('reset is explicit and changes only the onboarding preference', async () => {
  const preferences = createMemoryPreferences({ unrelated_setting: 'keep' });
  const storage = createOnboardingStorage(preferences.read, preferences.write);
  await storage.completeOnboarding();
  await storage.resetOnboarding();
  assert.equal(await storage.hasCompletedOnboarding(), false);
  assert.equal(preferences.values.get('unrelated_setting'), 'keep');
  assert.deepEqual(preferences.writes, [
    ['onboarding_completed_v1', 'true'],
    ['onboarding_completed_v1', 'false'],
  ]);
});

test('storage read failures propagate instead of masquerading as first launch', async () => {
  const failure = new Error('Storage unavailable');
  const storage = createOnboardingStorage(async () => { throw failure; }, async () => {});
  await assert.rejects(storage.hasCompletedOnboarding(), failure);
});

test('storage write failures propagate so the UI can offer a retry', async () => {
  const failure = new Error('Storage quota exceeded');
  const storage = createOnboardingStorage(async () => null, async () => { throw failure; });
  await assert.rejects(storage.completeOnboarding(), failure);
  await assert.rejects(storage.resetOnboarding(), failure);
});
