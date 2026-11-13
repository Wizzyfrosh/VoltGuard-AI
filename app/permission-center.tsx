import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Bell, ChevronRight, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { hasUsageAccess, openUsageAccessSettings } from '../modules/voltguard-battery';
import { readPermissionStatus } from '../src/features/onboarding/permission-status';

export default function PermissionCenterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notificationGranted, setNotificationGranted] = useState<boolean | null>(null);
  const [notificationCanAskAgain, setNotificationCanAskAgain] = useState(true);
  const [usageGranted, setUsageGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async (isActive: () => boolean = () => mountedRef.current) => {
    if (isActive()) {
      setRefreshing(true);
      setStatusError(null);
    }

    const errors: string[] = [];
    if (Platform.OS !== 'web') {
      const result = await readPermissionStatus(() => Notifications.getPermissionsAsync());
      if (result.failed) {
        errors.push('notification');
        if (isActive()) setNotificationGranted(null);
      } else if (isActive() && result.value) {
        setNotificationGranted(result.value.granted);
        setNotificationCanAskAgain(result.value.canAskAgain);
      }
    } else if (isActive()) {
      setNotificationGranted(false);
    }

    if (Platform.OS === 'android') {
      const result = await readPermissionStatus(() => hasUsageAccess());
      if (result.failed) {
        errors.push('Usage Access');
        if (isActive()) setUsageGranted(null);
      } else if (isActive() && result.value !== null) {
        setUsageGranted(result.value);
      }
    } else if (isActive()) {
      setUsageGranted(false);
    }

    if (isActive()) {
      setStatusError(errors.length
        ? `Could not read ${errors.join(' and ')} permission status. Refresh or check device settings.`
        : null);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh(() => mountedRef.current);
    });
    return () => subscription.remove();
  }, [refresh]);

  const requestNotifications = async () => {
    if (Platform.OS === 'web') return;
    setStatusError(null);
    let requestFailed = false;
    try {
      const current = await Notifications.getPermissionsAsync();
      if (!current.granted && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      const next = current.granted ? current : await Notifications.requestPermissionsAsync();
      setNotificationGranted(next.granted);
      setNotificationCanAskAgain(next.canAskAgain);
    } catch {
      requestFailed = true;
      setNotificationGranted(null);
      setStatusError('Notification permission request failed. Check device settings and try again.');
    } finally {
      if (!requestFailed) await refresh();
    }
  };

  const openUsage = () => {
    if (Platform.OS !== 'android') return;
    try {
      const opened = openUsageAccessSettings();
      if (!opened) setStatusError('Android did not open Usage Access settings. Open Settings manually and refresh this screen.');
      else setStatusError(null);
    } catch {
      setStatusError('Could not open Android Usage Access settings. Open Settings manually and refresh this screen.');
    }
  };

  const PermissionRow = ({ icon: Icon, title, description, granted, action, actionLabel }: {
    icon: typeof Bell; title: string; description: string; granted: boolean | null; action: () => void; actionLabel: string;
  }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}><Icon size={21} color={colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Text style={[styles.status, { color: granted === true ? colors.success : colors.textSecondary }]}>{granted === true ? 'Enabled' : granted === false ? 'Not enabled' : 'Status unavailable'}</Text>
        <Pressable onPress={action} accessibilityRole="button" style={[styles.button, { borderColor: colors.primary }]}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>{actionLabel}</Text>
          <ChevronRight size={15} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom, 24) }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>Permission centre</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Review optional access and manage it in your device settings.</Text>
        </View>
        <Pressable onPress={() => { void refresh(); }} accessibilityRole="button" accessibilityLabel="Refresh permission status" disabled={refreshing}>
          {refreshing ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={20} color={colors.primary} />}
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : <>
        {Platform.OS === 'web' ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Bell size={21} color={colors.primary} />
              <View style={styles.copy}>
                <Text style={[styles.heading, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>Native charging alerts and scheduled reminders are not available in the web app.</Text>
              </View>
            </View>
          </View>
        ) : (
          <PermissionRow icon={Bell} title="Notifications"
            description="Used for charging target alerts and battery-care reminders. Android notification channels can also be controlled separately."
            granted={notificationGranted} action={() => { void requestNotifications(); }}
            actionLabel={notificationGranted ? 'Check status' : notificationCanAskAgain ? 'Allow' : 'Open settings'} />
        )}
        {Platform.OS === 'android' ? (
          <PermissionRow icon={Smartphone} title="Usage Access (optional)"
            description="Allows VoltGuard to show app foreground time. It does not provide per-app battery consumption or mAh."
            granted={usageGranted} action={openUsage} actionLabel="Open settings" />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <ShieldCheck size={21} color={colors.primary} />
              <View style={styles.copy}>
                <Text style={[styles.heading, { color: colors.text }]}>Usage Access</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>This Android-only permission is not used on this platform.</Text>
              </View>
            </View>
          </View>
        )}
      </>}
      {statusError && <Text accessibilityRole="alert" style={[styles.footnote, { color: colors.warning }]}>{statusError}</Text>}
      <Text style={[styles.footnote, { color: colors.textSecondary }]}>You can revoke permissions at any time in your device settings. Some features may become unavailable when access is revoked.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  heading: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 12, fontWeight: '700' },
  button: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttonText: { fontSize: 12, fontWeight: '700' },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: 2 },
});