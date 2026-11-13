import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { hasCompletedOnboarding } from '../src/features/onboarding/onboarding.storage';
import { getOnboardingDestination } from '../src/features/onboarding/onboarding.flow';

export default function SplashScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void hasCompletedOnboarding()
      .then((completed) => {
        if (!active) return;
        router.replace(getOnboardingDestination(completed));
      })
      .catch(() => {
        // If local preference storage cannot be read, do not silently bypass
        // onboarding. The user can retry and the underlying error remains local.
        if (active) router.replace('/onboarding');
      });
    return () => { active = false; };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});