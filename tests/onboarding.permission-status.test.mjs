import test from 'node:test';
import assert from 'node:assert/strict';
import { readPermissionStatus } from '../src/features/onboarding/permission-status.ts';

test('returns the permission value when the native permission read succeeds', async () => {
  const result = await readPermissionStatus(async () => ({
    granted: true,
    canAskAgain: false,
  }));

  assert.deepEqual(result, {
    value: { granted: true, canAskAgain: false },
    failed: false,
  });
});

test('represents a denied permission as a successful read, not a read failure', async () => {
  const result = await readPermissionStatus(async () => ({
    granted: false,
    canAskAgain: true,
  }));

  assert.equal(result.failed, false);
  assert.equal(result.value?.granted, false);
});

test('represents native bridge errors as unknown without throwing', async () => {
  const result = await readPermissionStatus(async () => {
    throw new Error('Native permission bridge unavailable');
  });

  assert.deepEqual(result, { value: null, failed: true });
});

test('keeps independent permission reads isolated when one fails', async () => {
  const notification = await readPermissionStatus(async () => {
    throw new Error('Notification API failed');
  });
  const usageAccess = await readPermissionStatus(async () => true);

  assert.equal(notification.failed, true);
  assert.equal(notification.value, null);
  assert.deepEqual(usageAccess, { value: true, failed: false });
});
