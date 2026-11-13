export type OnboardingDestination = '/onboarding' | '/(tabs)/dashboard';

export function getOnboardingDestination(completed: boolean): OnboardingDestination {
  return completed ? '/(tabs)/dashboard' : '/onboarding';
}
