import { getBatteryPreference, setBatteryPreference } from '../battery/battery.database';
import { createOnboardingStorage } from './onboarding.storage-core';

const storage = createOnboardingStorage(getBatteryPreference, setBatteryPreference);

export const hasCompletedOnboarding = storage.hasCompletedOnboarding;
export const completeOnboarding = storage.completeOnboarding;
export const resetOnboarding = storage.resetOnboarding;
