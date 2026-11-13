import { Platform } from 'react-native';
import { getBatteryPreference, setBatteryPreference } from '../battery/battery.database';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_v1';

async function readCompletionValue(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(ONBOARDING_COMPLETED_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return getBatteryPreference(ONBOARDING_COMPLETED_KEY);
}

async function writeCompletionValue(value: 'true' | 'false'): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (!globalThis.localStorage) throw new Error('Browser storage is unavailable');
      globalThis.localStorage.setItem(ONBOARDING_COMPLETED_KEY, value);
      return;
    } catch {
      throw new Error('Unable to save onboarding progress in browser storage');
    }
  }
  await setBatteryPreference(ONBOARDING_COMPLETED_KEY, value);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await readCompletionValue()) === 'true';
}

export async function completeOnboarding(): Promise<void> {
  await writeCompletionValue('true');
}

export async function resetOnboarding(): Promise<void> {
  await writeCompletionValue('false');
}
