import { getBatteryPreference, setBatteryPreference } from '../battery/battery.database';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_v1';

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await getBatteryPreference(ONBOARDING_COMPLETED_KEY)) === 'true';
}

export async function completeOnboarding(): Promise<void> {
  await setBatteryPreference(ONBOARDING_COMPLETED_KEY, 'true');
}

export async function resetOnboarding(): Promise<void> {
  await setBatteryPreference(ONBOARDING_COMPLETED_KEY, 'false');
}
