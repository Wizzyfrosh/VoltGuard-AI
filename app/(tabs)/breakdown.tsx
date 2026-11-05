import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Info, Battery, Smartphone, Clock3, ShieldCheck, RefreshCw, Settings2 } from 'lucide-react-native';
import { getAppUsageStats, hasUsageAccess, openUsageAccessSettings, type AppUsageSnapshot } from '../../modules/voltguard-battery';

function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function BreakdownScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [usage, setUsage] = useState<AppUsageSnapshot | null>(null);
  const [usageGranted, setUsageGranted] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const refreshUsage = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setLoadingUsage(true);
    try {
      const granted = hasUsageAccess();
      setUsageGranted(granted);
      setUsage(granted ? getAppUsageStats() : null);
    } catch {
      setUsage(null);
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Power Usage</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Reliable power attribution is not available through the current cross-platform APIs.
        </Text>
        <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Battery size={28} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Battery energy attribution</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Android does not expose reliable per-app battery energy (mAh) to ordinary apps. VoltGuard will not label foreground time as battery drain or invent per-app percentages.
          </Text>
        </View>
        <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.usageHeader}>
            <View style={styles.usageHeading}>
              <Clock3 size={21} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>App foreground activity</Text>
            </View>
            <Pressable onPress={refreshUsage} disabled={loadingUsage} accessibilityRole="button" accessibilityLabel="Refresh app usage">
              {loadingUsage ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={19} color={colors.primary} />}
            </Pressable>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Approximate time apps were in the foreground over the last 24 hours. This is usage activity, not measured battery consumption.
          </Text>
          {Platform.OS !== 'android' ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>App usage access is available only in the Android app.</Text>
          ) : !usageGranted ? (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Optional permission: Android Usage Access lets VoltGuard read app foreground-time summaries. Data stays on this device and can be revoked in Android Settings.
              </Text>
              <Pressable
                style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                onPress={() => { openUsageAccessSettings(); }}
                accessibilityRole="button"
              >
                <Settings2 size={17} color="#FFFFFF" />
                <Text style={styles.permissionButtonText}>Grant Usage Access</Text>
              </Pressable>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>Return to this screen after enabling VoltGuard in Usage Access settings, then tap refresh.</Text>
            </>
          ) : (
            <>
              <View style={styles.usageMeta}>
                <ShieldCheck size={15} color={colors.primary} />
                <Text style={[styles.caption, { color: colors.textSecondary }]}>Permission granted · Local device data · Last 24 hours</Text>
              </View>
              {usage?.apps?.length ? usage.apps.map((app) => (
                <View key={app.packageName} style={[styles.appRow, { borderTopColor: colors.border }]}>
                  <View style={styles.appCopy}>
                    <Text numberOfLines={1} style={[styles.appName, { color: colors.text }]}>{app.appLabel}</Text>
                    <Text numberOfLines={1} style={[styles.caption, { color: colors.textSecondary }]}>{app.packageName}</Text>
                  </View>
                  <Text style={[styles.appDuration, { color: colors.text }]}>{formatDuration(app.foregroundTimeMs)}</Text>
                </View>
              )) : (
                <Text style={[styles.body, { color: colors.textSecondary }]}>No foreground activity was returned for this period. This can happen when Usage Access was just enabled or the system has not populated usage history.</Text>
              )}
              <Text style={[styles.caption, { color: colors.textSecondary }]}>Usage summaries are supplied by Android and may be delayed or incomplete. VoltGuard does not collect screen contents, messages or keystrokes.</Text>
            </>
          )}
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Info size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>What comes next</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Future versions can provide transparent estimates from locally collected battery-level and charging-session observations. They will be labelled as estimates and will not claim to identify exact app-level drain.
            </Text>
          </View>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Smartphone size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Platform differences</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Operating systems restrict access to detailed power attribution. Available diagnostics will depend on the device and operating system.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  noticeCard: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 16 },
  usageCard: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 16 },
  usageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  usageHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  usageMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, gap: 12 },
  appCopy: { flex: 1, gap: 3 },
  appName: { fontSize: 14, fontWeight: '700' },
  appDuration: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caption: { fontSize: 11, lineHeight: 16 },
  permissionButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  permissionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 12 },
  infoContent: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
});
