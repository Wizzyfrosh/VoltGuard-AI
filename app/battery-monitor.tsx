import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Battery from 'expo-battery';
import { ArrowLeft, BatteryCharging, BatteryFull, Clock3, RefreshCw, Thermometer } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useBatteryTelemetry } from '../src/features/battery/useBatteryTelemetry';
import { getBatteryMonitorReport } from '../src/features/battery/battery.history';
import type { BatteryMonitorReport } from '../src/features/battery/battery.monitor';

function durationLabel(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return 'Unavailable';
  if (minutes < 60) return `About ${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder ? `About ${hours} hr ${remainder} min` : `About ${hours} hr`;
}
function rangeLabel(minimum: number | null, maximum: number | null, unit: string, digits = 1): string {
  if (minimum === null || maximum === null) return 'Unavailable';
  if (minimum === maximum) return `${minimum.toFixed(digits)}${unit}`;
  return `${minimum.toFixed(digits)}–${maximum.toFixed(digits)}${unit}`;
}
function Metric({ label, value, hint, colors }: { label: string; value: string; hint?: string; colors: any }) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}
function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>{children}
  </View>;
}

export default function BatteryMonitorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const live = useBatteryTelemetry();
  const [report, setReport] = useState<BatteryMonitorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReport(await getBatteryMonitorReport()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load battery history.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => { if (live.observedAt) void refresh(); }, [live.observedAt, refresh]);
  const diagnostic = live.androidDiagnostics;
  const estimate = report?.estimate;
  const charging = live.state === Battery.BatteryState.CHARGING || live.state === Battery.BatteryState.FULL;
  const status = live.state === Battery.BatteryState.CHARGING ? 'Charging'
    : live.state === Battery.BatteryState.FULL ? 'Fully charged'
    : live.state === Battery.BatteryState.UNPLUGGED ? 'On battery' : 'Status unavailable';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.iconButton, { borderColor: colors.border }]}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>DEVICE INSIGHTS</Text>
          <Text style={[styles.title, { color: colors.text }]}>Battery Monitor</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh battery monitor" onPress={() => { void refresh(); }} disabled={loading} style={[styles.iconButton, { borderColor: colors.border, opacity: loading ? 0.5 : 1 }]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Live battery status" colors={colors}>
          <View style={styles.hero}>
            {charging ? <BatteryCharging size={28} color={colors.success} /> : <BatteryFull size={28} color={colors.primary} />}
            <Text style={[styles.level, { color: colors.text }]}>{live.level === null ? '—' : `${Math.round(live.level * 100)}%`}</Text>
            <Text style={[styles.status, { color: colors.success }]}>{status}</Text>
          </View>
          <View style={styles.grid}>
            <Metric label="Voltage" value={diagnostic?.voltageMilliVolts != null ? `${(diagnostic.voltageMilliVolts / 1000).toFixed(2)} V` : 'Unavailable'} colors={colors} />
            <Metric label="Temperature" value={diagnostic?.temperatureCelsius != null ? `${diagnostic.temperatureCelsius.toFixed(1)} °C` : 'Unavailable'} colors={colors} />
            <Metric label="Battery current" value={diagnostic?.currentNowMilliAmps != null ? `${diagnostic.currentNowMilliAmps} mA` : 'Unavailable'} hint="Battery-side current" colors={colors} />
            <Metric label="Average current" value={diagnostic?.currentAverageMilliAmps != null ? `${diagnostic.currentAverageMilliAmps} mA` : 'Unavailable'} colors={colors} />
            <Metric label="Remaining charge" value={diagnostic?.remainingChargeMilliAmpHours != null ? `${diagnostic.remainingChargeMilliAmpHours} mAh` : 'Unavailable'} hint="Not design capacity" colors={colors} />
            <Metric label="Energy counter" value={diagnostic?.energyCounterMilliWattHours != null ? `${diagnostic.energyCounterMilliWattHours} mWh` : 'Unavailable'} colors={colors} />
            <Metric label="Technology" value={diagnostic?.technology ?? 'Unavailable'} colors={colors} />
            <Metric label="Cycle count" value={diagnostic?.cycleCount != null ? String(diagnostic.cycleCount) : 'Unavailable'} hint="Only when reported by Android" colors={colors} />
            <Metric label="OS battery health" value={diagnostic?.health?.replace(/[-_]/g, ' ') ?? 'Unavailable'} hint="Status, not a wear percentage" colors={colors} />
            <Metric label="Charging source" value={diagnostic?.plugged && diagnostic.plugged !== 'none-or-unknown' ? diagnostic.plugged : 'Unavailable'} colors={colors} />
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Hardware readings are supplied by Android when supported. Battery-side current is not USB adapter input current. Missing values remain unavailable.</Text>
          {live.diagnosticsObservedAt ? <Text style={[styles.hint, { color: colors.textSecondary }]}>Diagnostics observed {new Date(live.diagnosticsObservedAt).toLocaleString()}</Text> : null}
        </Section>
        <Section title="Charging and depletion estimate" colors={colors}>
          {estimate?.minutesRemaining !== null && estimate?.minutesRemaining !== undefined ? (
            <>
              <View style={styles.estimate}>
                <Clock3 size={21} color={colors.primary} />
                <Text style={[styles.estimateValue, { color: colors.text }]}>{durationLabel(estimate.minutesRemaining)}</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Estimated time {estimate.direction === 'charging' ? 'to full' : 'until depletion'} · {estimate.percentPerHour?.toFixed(1)} percentage points/hour</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Confidence: {estimate.confidence} · {estimate.sampleCount} observations over {estimate.elapsedMinutes} minutes</Text>
            </>
          ) : <Text style={[styles.body, { color: colors.textSecondary }]}>{estimate?.explanation ?? 'Enable Battery history and collect consistent observations to unlock an estimate.'}</Text>}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Trend-based estimates change with device use, temperature, network conditions and charging behaviour. They are not guarantees.</Text>
        </Section>
        <Section title="Observed hardware ranges · 30 days" colors={colors}>
          {loading && !report ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={[styles.body, { color: colors.warning }]}>{error}</Text> : report ? (
            <>
              <View style={styles.grid}>
                <Metric label="Temperature" value={rangeLabel(report.temperature.minimum, report.temperature.maximum, ' °C')} hint={`${report.temperature.sampleCount} observations`} colors={colors} />
                <Metric label="Voltage" value={rangeLabel(report.voltage.minimum, report.voltage.maximum, ' mV', 0)} hint={`${report.voltage.sampleCount} observations`} colors={colors} />
                <Metric label="Current" value={rangeLabel(report.current.minimum, report.current.maximum, ' mA', 0)} hint={`${report.current.sampleCount} observations`} colors={colors} />
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{report.sampleCount} battery observations across {report.observedDays} observed days. Missing periods are not interpolated.</Text>
            </>
          ) : null}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>History is stored locally only when Battery history is enabled. Sampling occurs while VoltGuard is active; screen-off coverage is not guaranteed.</Text>
          {Platform.OS === 'web' ? <Text style={[styles.hint, { color: colors.warning }]}>Battery hardware history is unavailable in the web build.</Text> : null}
        </Section>
        <Section title="Battery condition" colors={colors}>
          <View style={styles.estimate}>
            <Thermometer size={21} color={colors.primary} />
            <Text style={[styles.condition, { color: colors.text }]}>{diagnostic?.health?.replace(/[-_]/g, ' ') ?? 'Unavailable'}</Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Android&apos;s health field is an operating-system status. It does not represent remaining battery capacity or a wear percentage.</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Capacity-based wear remains unavailable unless the device exposes verified design capacity and full-charge capacity.</Text>
        </Section>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  iconButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 22, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 13 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  hero: { alignItems: 'center', gap: 5, paddingVertical: 8 },
  level: { fontSize: 38, fontWeight: '900' },
  status: { fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48%', flexGrow: 1, minWidth: 125, borderWidth: 1, borderRadius: 13, padding: 11, gap: 4 },
  metricLabel: { fontSize: 10, fontWeight: '700' },
  metricValue: { fontSize: 14, fontWeight: '900', textTransform: 'capitalize' },
  hint: { fontSize: 11, lineHeight: 17 },
  body: { fontSize: 12, lineHeight: 18 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  estimateValue: { fontSize: 23, fontWeight: '900' },
  condition: { fontSize: 16, fontWeight: '900', textTransform: 'capitalize' },
});
