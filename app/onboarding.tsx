import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { ArrowLeft, ArrowRight, BatteryCharging, Bell, CheckCircle2, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { completeOnboarding } from '../src/features/onboarding/onboarding.storage';
import { readPermissionStatus } from '../src/features/onboarding/permission-status';
import { hasUsageAccess, openUsageAccessSettings } from '../modules/voltguard-battery';

type Step = 0 | 1 | 2;
const slides = [
  { title: 'Know your battery better', body: 'See live battery status, charging activity and device diagnostics when your phone exposes them.', Icon: BatteryCharging },
  { title: 'Understand what VoltGuard can access', body: 'Notifications are used for charging alerts and reminders. Usage Access is optional and only adds app foreground-time insights.', Icon: ShieldCheck },
  { title: 'You stay in control', body: 'Choose permissions when a feature needs them. You can change access later in Android or iOS Settings.', Icon: Smartphone },
] as const;

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [notificationState, setNotificationState] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [notificationCanAskAgain, setNotificationCanAskAgain] = useState(true);
  const [usageState, setUsageState] = useState<'unknown' | 'granted' | 'not-granted' | 'unsupported'>('unknown');
  const slide = slides[step];
  const progress = useMemo(() => (step + 1) / slides.length, [step]);

  const finish = async () => {
    setBusy(true);
    setCompletionError(null);
    try {
      await completeOnboarding();
      if (!mountedRef.current) return;
      router.replace('/(tabs)/dashboard');
    } catch {
      if (!mountedRef.current) return;
      setCompletionError('VoltGuard could not save your setup status. Check device storage and try again.');
      setBusy(false);
    }
  };

  const requestNotifications = async () => {
    setPermissionError(null);
    if (Platform.OS === 'web') { setNotificationState('unsupported'); return; }
    setBusy(true);
    try {
      const current = await Notifications.getPermissionsAsync();
      if (!mountedRef.current) return;
      if (!current.granted && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      const result = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!mountedRef.current) return;
      setNotificationState(result.granted ? 'granted' : 'denied');
      setNotificationCanAskAgain(result.canAskAgain);
    } catch {
      if (mountedRef.current) setPermissionError('Notification permission could not be checked. You can retry or continue without it.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshPermissionStatuses = React.useCallback(async (isActive: () => boolean = () => mountedRef.current) => {
    if (Platform.OS !== 'web') {
      const result = await readPermissionStatus(() => Notifications.getPermissionsAsync());
      if (isActive()) {
        if (result.failed || !result.value) {
          setNotificationState('unknown');
          setPermissionError('Notification permission status could not be read. Retry or continue without notifications.');
        } else {
          setNotificationState(result.value.granted ? 'granted' : 'denied');
          setNotificationCanAskAgain(result.value.canAskAgain);
        }
      }
    }
    if (Platform.OS === 'android') {
      const result = await readPermissionStatus(() => hasUsageAccess());
      if (isActive()) {
        if (result.failed || result.value === null) {
          setUsageState('unknown');
          setPermissionError('Usage Access status could not be read. Retry or continue without it.');
        } else {
          setUsageState(result.value ? 'granted' : 'not-granted');
        }
      }
    }
  }, []);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    void refreshPermissionStatuses(() => active && mountedRef.current);
    return () => { active = false; };
  }, [refreshPermissionStatuses]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissionStatuses();
    });
    return () => subscription.remove();
  }, [refreshPermissionStatuses]);

  const checkUsage = async () => {
    if (Platform.OS !== 'android') { setUsageState('unsupported'); return; }
    setBusy(true);
    try {
      const granted = await hasUsageAccess();
      if (mountedRef.current) setUsageState(granted ? 'granted' : 'not-granted');
    } catch {
      if (mountedRef.current) setPermissionError('Usage Access status could not be read. Check Android Settings or retry.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const openUsageSettings = () => {
    if (Platform.OS !== 'android') return;
    try {
      const opened = openUsageAccessSettings();
      if (!opened) setPermissionError('Android could not open Usage Access settings. Open Settings manually and retry.');
    } catch {
      setPermissionError('Could not open Android Usage Access settings. Open Settings manually and try again.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <Text style={[styles.brand, { color: colors.text }]}>VoltGuard</Text>
        <Pressable onPress={() => { void finish(); }} disabled={busy} accessibilityRole="button">
          <Text style={[styles.skip, { color: colors.primary }]}>Skip setup</Text>
        </Pressable>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
          <slide.Icon size={42} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>GETTING STARTED · {step + 1} OF 3</Text>
        <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{slide.body}</Text>

        {step === 1 && (
          <View style={[styles.permissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.permissionHeader}>
              <View style={[styles.permissionIcon, { backgroundColor: colors.primary + '15' }]}><Bell size={20} color={colors.primary} /></View>
              <View style={styles.permissionCopy}>
                <Text style={[styles.permissionTitle, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>For charging target alerts and scheduled battery-care reminders.</Text>
              </View>
              {notificationState === 'granted' && <CheckCircle2 size={20} color={colors.success} />}
            </View>
            <Pressable onPress={() => { void requestNotifications(); }} disabled={busy || notificationState === 'granted'}
              style={[styles.secondaryButton, { borderColor: colors.primary }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{notificationState === 'granted' ? 'Permission granted' : notificationState === 'unsupported' ? 'Unavailable on web' : notificationState === 'denied' ? (notificationCanAskAgain ? 'Try permission again' : 'Open device settings') : 'Allow notifications'}</Text>
            </Pressable>
            {notificationState === 'denied' && <Text style={[styles.hint, { color: colors.textSecondary }]}>You can enable notifications later in your device settings.</Text>}
            {Platform.OS === 'web' && <Text style={[styles.hint, { color: colors.textSecondary }]}>Native charging alerts and scheduled reminders are available in the mobile app.</Text>}
            {Platform.OS === 'android' && (
              <>
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                <View style={styles.permissionHeader}>
                  <View style={[styles.permissionIcon, { backgroundColor: colors.primary + '15' }]}><Smartphone size={20} color={colors.primary} /></View>
                  <View style={styles.permissionCopy}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Usage Access (optional)</Text>
                    <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>Shows app foreground time. It does not measure per-app battery consumption.</Text>
                  </View>
                  {usageState === 'granted' && <CheckCircle2 size={20} color={colors.success} />}
                </View>
                {usageState === 'not-granted' && <Text style={[styles.hint, { color: colors.textSecondary }]}>Access is not enabled. You can grant it in Android Settings or skip it.</Text>}
                {usageState === 'unknown' && <Text style={[styles.hint, { color: colors.textSecondary }]}>Access status could not be verified yet. Check again or continue without it.</Text>}
                <View style={styles.buttonRow}>
                  <Pressable onPress={() => { void checkUsage(); }} disabled={busy} style={[styles.secondaryButton, styles.flexButton, { borderColor: colors.border }]}>
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{usageState === 'granted' ? 'Access granted' : usageState === 'unknown' ? 'Check access status' : 'Check access'}</Text>
                  </Pressable>
                  <Pressable onPress={openUsageSettings} style={[styles.secondaryButton, styles.flexButton, { borderColor: colors.primary }]}>
                    <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Open settings</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
        {permissionError && (
          <View accessibilityRole="alert" style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.warning }]}>
            <Text style={[styles.errorText, { color: colors.text }]}>{permissionError}</Text>
            <Pressable onPress={() => setPermissionError(null)} accessibilityRole="button">
              <Text style={[styles.retryText, { color: colors.primary }]}>Dismiss</Text>
            </Pressable>
          </View>
        )}
        {step === 2 && (
          <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ShieldCheck size={22} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>No permission is required to view basic battery level and charging state. Optional access can be granted later from Settings. VoltGuard does not need access to your contacts, messages or files for these features.</Text>
          </View>
        )}
      </ScrollView>
      {completionError && (
        <View accessibilityRole="alert" style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.danger }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{completionError}</Text>
          <Pressable onPress={() => { void finish(); }} disabled={busy} accessibilityRole="button">
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry saving setup</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.footer}>
        {step > 0 && (
          <Pressable onPress={() => setStep((step - 1) as Step)} style={[styles.backButton, { borderColor: colors.border }]} accessibilityRole="button">
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
        )}
        <Pressable onPress={() => step < 2 ? setStep((step + 1) as Step) : void finish()} disabled={busy}
          style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1, opacity: busy ? 0.7 : 1 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <>
            <Text style={styles.primaryButtonText}>{step < 2 ? 'Continue' : 'Get started'}</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 22 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 19, fontWeight: '800', letterSpacing: 0.2 },
  skip: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 4 },
  body: { flexGrow: 1, paddingTop: 34, paddingBottom: 24 },
  iconWrap: { width: 78, height: 78, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 12 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 23, marginBottom: 24 },
  permissionCard: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 13 },
  permissionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  permissionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  permissionCopy: { flex: 1, gap: 4 },
  permissionTitle: { fontSize: 14, fontWeight: '700' },
  permissionBody: { fontSize: 12, lineHeight: 17 },
  secondaryButton: { minHeight: 42, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryButtonText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 11, lineHeight: 16 },
  separator: { height: 1, marginVertical: 2 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  flexButton: { flex: 1 },
  noteCard: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: 'row', gap: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  errorCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 8 },
  errorText: { fontSize: 12, lineHeight: 18 },
  retryText: { fontSize: 13, fontWeight: '800' },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  backButton: { width: 52, height: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
