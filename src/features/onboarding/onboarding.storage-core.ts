export type PreferenceReader = (key: string) => Promise<string | null>;
export type PreferenceWriter = (key: string, value: string) => Promise<void>;

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_v1';

/**
 * Keeps onboarding persistence independent from the platform database so its
 * read/write contract can be exercised without loading native modules.
 */
export function createOnboardingStorage(read: PreferenceReader, write: PreferenceWriter) {
  return {
    async hasCompletedOnboarding(): Promise<boolean> {
      return (await read(ONBOARDING_COMPLETED_KEY)) === 'true';
    },
    async completeOnboarding(): Promise<void> {
      await write(ONBOARDING_COMPLETED_KEY, 'true');
    },
    async resetOnboarding(): Promise<void> {
      await write(ONBOARDING_COMPLETED_KEY, 'false');
    },
  };
}
