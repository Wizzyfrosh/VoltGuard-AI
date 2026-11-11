import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Info, Battery, Smartphone, Clock3, ShieldCheck, RefreshCw, Settings2 } from 'lucide-react-native';
import { getAppUsageStats, getSystemResourceDiagnostics, hasUsageAccess, openUsageAccessSettings, type AppUsageSnapshot, type SystemResourceDiagnostics } from '../../modules/voltguard-battery';
import { useBatteryTrends } from '../../src/features/battery/useBatteryTrends';

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  const gib = bytes / (1024 ** 3);
  return gib >= 1 ? `${gib.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : value.toFixed(1) + '%';
}

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
  const [resources, setResources] = useState<SystemResourceDiagnostics | null>(null);
  const trends = useBatteryTrends();
  const mountedRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const refreshUsage = useCallback(async () => {
    if (Platform.OS !== 'android' || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setLoadingUsage(true);
    try {
      const [resourceSnapshot, granted] = await Promise.all([
        getSystemResourceDiagnostics(),
        hasUsageAccess(),
      ]);
      const usageSnapshot = granted ? await getAppUsageStats() : null;
      if (!mountedRef.current) return;
      setResources(resourceSnapshot);
      setUsageGranted(granted);
      setUsage(usageSnapshot);
    } catch {
      if (!mountedRef.current) return;
      setUsage(null);
      setResources(null);
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshUsage();
    return () => { mountedRef.current = false; };
  }, [refreshUsage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Power Usage</Text>
        <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.usageHeader}>
            <View style={styles.appCopy}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Battery trends</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>Calculated from saved device readings · No export or cloud upload</Text>
            </View>
            <Pressable onPress={() => { void trends.refresh(); }} disabled={trends.isLoading} accessibilityRole="button" accessibilityLabel="Refresh battery trends">
              {trends.isLoading ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={19} color={colors.primary} />}
            </Pressable>
          </View>
          <View style={styles.periodToggle}>
            {(['week', 'month'] as const).map((period) => (
              <Pressable key={period} onPress={() => trends.setPeriod(period)} accessibilityRole="button"
                accessibilityState={{ selected: trends.period === period }}
                style={[styles.periodButton, { backgroundColor: trends.period === period ? colors.primary : 'transparent', borderColor: trends.period === period ? colors.primary : colors.border }]}>
                <Text style={{ color: trends.period === period ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 12 }}>
                  {period === 'week' ? '7 days' : '30 days'}
                </Text>
              </Pressable>
            ))}
          </View>
          {trends.isLoading && !trends.report ? <ActivityIndicator color={colors.primary} /> : trends.error ? (
            <Text style={[styles.body, { color: colors.warning }]}>{trends.error}</Text>
          ) : trends.report ? (
            <>
              <View style={styles.trendSummary}>
                <View style={[styles.trendMetric, { backgroundColor: colors.background }]}>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>Observed charge gain</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(trends.report.chargedPercent)}</Text>
                </View>
                <View style={[styles.trendMetric, { backgroundColor: colors.background }]}>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>Observed discharge</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(trends.report.dischargedPercent)}</Text>
                </View>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.caption, { color: colors.textSecondary }]}>Charged</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.warning }]} /><Text style={[styles.caption, { color: colors.textSecondary }]}>Discharged</Text></View>
              </View>
              <View style={styles.trendChart}>
                {trends.report.buckets.map((bucket) => {
                  const maxValue = Math.max(...trends.report!.buckets.flatMap((item) => [item.chargedPercent ?? 0, item.dischargedPercent ?? 0]), 1);
                  const chargeHeight = bucket.chargedPercent === null ? 3 : Math.max(3, (bucket.chargedPercent / maxValue) * 94);
                  const dischargeHeight = bucket.dischargedPercent === null ? 3 : Math.max(3, (bucket.dischargedPercent / maxValue) * 94);
                  return (
                    <View key={bucket.key} style={styles.chartColumn}>
                      <View style={styles.barPair}>
                        <View style={[styles.chartBar, { height: chargeHeight, backgroundColor: bucket.chargedPercent === null ? colors.border : colors.primary, opacity: bucket.chargedPercent === null ? 0.35 : 1 }]} />
                        <View style={[styles.chartBar, { height: dischargeHeight, backgroundColor: bucket.dischargedPercent === null ? colors.border : colors.warning, opacity: bucket.dischargedPercent === null ? 0.35 : 1 }]} />
                      </View>
                      <Text numberOfLines={1} style={[styles.chartLabel, { color: colors.textSecondary }]}>{bucket.label}</Text>
                      <Text style={[styles.chartCount, { color: colors.textSecondary }]}>{bucket.sampleCount}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.sessionStats}>
                <View style={styles.sessionStat}><Text style={[styles.caption, { color: colors.textSecondary }]}>Charging sessions</Text><Text style={[styles.appDuration, { color: colors.text }]}>{trends.report.chargingSessionCount}</Text></View>
                <View style={styles.sessionStat}><Text style={[styles.caption, { color: colors.textSecondary }]}>Completed</Text><Text style={[styles.appDuration, { color: colors.text }]}>{trends.report.completedSessionCount}</Text></View>
                <View style={styles.sessionStat}><Text style={[styles.caption, { color: colors.textSecondary }]}>Avg. session gain</Text><Text style={[styles.appDuration, { color: colors.text }]}>{formatPercent(trends.report.averageSessionGainPercent)}</Text></View>
              </View>
              <View style={styles.sessionDuration}>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>Completed observed intervals</Text>
                <Text style={[styles.appDuration, { color: colors.text }]}>
                  {trends.report.totalCompletedObservedMinutes === null ? '—' : formatDuration(trends.report.totalCompletedObservedMinutes * 60000)}
                </Text>
              </View>
              <View style={styles.usageMeta}>
                <ShieldCheck size={15} color={colors.primary} />
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  {trends.report.coverage.toUpperCase()} coverage · {trends.report.sampleCount} readings across {trends.report.observedDays} days · Up to 30 days retained
                </Text>
              </View>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>{trends.report.explanation}</Text>
            </>
          ) : null}
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
                  <View style={styles.appIdentity}>
                    {app.iconDataUri ? (
                      <Image source={{ uri: app.iconDataUri }} style={styles.appIcon} resizeMode="contain" />
                    ) : (
                      <View style={[styles.appIconFallback, { backgroundColor: colors.background }]}>
                        <Smartphone size={19} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.appCopy}>
                      <Text numberOfLines={1} style={[styles.appName, { color: colors.text }]}>{app.appLabel}</Text>
                      <Text numberOfLines={1} style={[styles.caption, { color: colors.textSecondary }]}>{app.packageName}</Text>
                    </View>
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
        <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.usageHeading}>
            <Smartphone size={21} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Device resources</Text>
          </View>
          {Platform.OS !== 'android' ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>System RAM and storage diagnostics are available in the Android app only.</Text>
          ) : resources ? (
            <>
              <View style={[styles.resourceRow, { borderTopColor: colors.border }]}>
                <View style={styles.appCopy}>
                  <Text style={[styles.appName, { color: colors.text }]}>RAM available</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>Available / total physical memory</Text>
                </View>
                <Text style={[styles.appDuration, { color: colors.text }]}>{formatBytes(resources.availableRamBytes)} / {formatBytes(resources.totalRamBytes)}</Text>
              </View>
              <View style={styles.resourceRow}>
                <View style={styles.appCopy}>
                  <Text style={[styles.appName, { color: colors.text }]}>Internal storage available</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>Available / total data partition</Text>
                </View>
                <Text style={[styles.appDuration, { color: colors.text }]}>{formatBytes(resources.availableStorageBytes)} / {formatBytes(resources.totalStorageBytes)}</Text>
              </View>
              {resources.lowMemory === true && (
                <Text style={[styles.body, { color: colors.warning }]}>Android currently reports a low-memory condition.</Text>
              )}
            </>
          ) : (
            <Text style={[styles.body, { color: colors.textSecondary }]}>Device resource information is temporarily unavailable.</Text>
          )}
          <Text style={[styles.caption, { color: colors.textSecondary }]}>These are system resource readings, not a performance score. VoltGuard does not kill apps or claim to clean RAM.</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Info size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Battery trends</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              VoltGuard can estimate device-level discharge rate from opted-in local battery history. This is separate from app foreground time and does not identify which app consumed energy.
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
  periodToggle: { flexDirection: 'row', gap: 8 },
  periodButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  trendSummary: { flexDirection: 'row', gap: 9 },
  trendMetric: { flex: 1, borderRadius: 12, padding: 12, gap: 4 },
  metricValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chartLegend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  trendChart: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: 4, height: 132 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 0 },
  barPair: { height: 94, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  chartBar: { width: 9, minHeight: 3, maxHeight: '100%', borderRadius: 4 },
  chartLabel: { fontSize: 9, textAlign: 'center' },
  chartCount: { fontSize: 9, opacity: 0.75 },
  sessionStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#80808055', paddingTop: 11 },
  sessionStat: { flex: 1, gap: 4 },
  sessionDuration: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#80808055', paddingTop: 9 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, gap: 12 },
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
