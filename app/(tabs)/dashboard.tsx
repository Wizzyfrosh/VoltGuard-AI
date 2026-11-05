import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Battery from 'expo-battery';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { BatteryGauge } from '../../src/components/dashboard/BatteryGauge';
import { DashboardAction } from '../../src/components/dashboard/DashboardAction';
import { useBatteryTelemetry } from '../../src/features/battery/useBatteryTelemetry';
import { getBatteryDrainAnalysis } from '../../src/features/battery/battery.history';
import { explainBatteryHealth, type BatteryDrainAnalysis } from '../../src/features/battery/battery.analysis';
import { Bot, Activity, Thermometer, Zap, PlugZap, ShieldCheck, Smartphone } from 'lucide-react-native';

function getChargingLabel(state: Battery.BatteryState): string {
  switch (state) {
    case Battery.BatteryState.CHARGING: return 'Charging';
    case Battery.BatteryState.FULL: return 'Fully charged';
    case Battery.BatteryState.UNPLUGGED: return 'Not charging';
    default: return 'Status unavailable';
  }
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const reading = useBatteryTelemetry();
  const isCharging = reading.state === Battery.BatteryState.CHARGING;
  const diagnostics = reading.androidDiagnostics;
  const [drainAnalysis, setDrainAnalysis] = useState<BatteryDrainAnalysis | null>(null);
  useEffect(() => {
    let active = true;
    void getBatteryDrainAnalysis().then((result) => { if (active) setDrainAnalysis(result); }).catch(() => {
      if (active) setDrainAnalysis(null);
    });
    return () => { active = false; };
  }, [reading.observedAt]);
  const healthExplanation = explainBatteryHealth(diagnostics?.health ?? null);
  const gaugeSize = Math.max(176, Math.min(width - 112, 250));
  const chargingLabel = getChargingLabel(reading.state);
  const cardBackground = colors.card;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 22 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandMark}><Zap size={25} color="#F5B91B" fill="#F5B91B" /></View>
          <View style={styles.brandCopy}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>DEVICE OVERVIEW</Text>
            <Text style={[styles.appName, { color: colors.text }]}>VoltGuard <Text style={{ color: '#F5B91B' }}>AI</Text></Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Monitor  •  Optimize  •  Prolong</Text>
          </View>
        </View>

        <View style={styles.gaugeSection}>
          <BatteryGauge percentage={reading.level} isCharging={isCharging} statusLabel={chargingLabel} size={gaugeSize} />
          <Text style={[styles.gaugeLabel, { color: colors.text }]}>Battery level</Text>
          <Text style={[styles.gaugeSubLabel, { color: colors.textSecondary }]}>
            {reading.level === null ? 'Waiting for device telemetry' : isCharging ? 'Charging in progress' : 'Live device reading'}
          </Text>
        </View>

        {reading.hasError && reading.level === null && (
          <View style={[styles.notice, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.noticeText, { color: colors.warning }]}>Battery percentage is not being reported by this device API yet. Other available diagnostics are shown below.</Text>
          </View>
        )}

        <View style={styles.metricsRow}>
          <MetricCard icon={<Thermometer size={25} color="#F5A623" />} label="Temperature" value={diagnostics?.temperatureCelsius != null ? `${diagnostics.temperatureCelsius.toFixed(1)} °C` : 'Unavailable'} hint="Battery sensor" colors={colors} />
          <MetricCard icon={<Activity size={25} color="#10D69A" />} label="Battery health" value={diagnostics?.health ? diagnostics.health.replace('-', ' ') : 'Unavailable'} hint="System report" colors={colors} />
          <MetricCard icon={<Zap size={25} color="#3487FF" />} label="Voltage" value={diagnostics?.voltageMilliVolts != null ? `${(diagnostics.voltageMilliVolts / 1000).toFixed(2)} V` : 'Unavailable'} hint="Battery voltage" colors={colors} />
        </View>

        <View style={[styles.insightCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.hardwareHeader}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text style={[styles.capabilityTitle, { color: colors.text }]}>Battery health assessment</Text>
          </View>
          <Text style={[styles.insightValue, { color: colors.text }]}>{healthExplanation.condition.replace('reported-', '').replace('-', ' ')}</Text>
          <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>{healthExplanation.message}</Text>
          <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>Estimated battery wear: unavailable. A reliable estimate requires verified design capacity and full-charge capacity; this device API has not supplied both.</Text>
        </View>

        <View style={[styles.insightCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.hardwareHeader}>
            <Activity size={20} color={colors.primary} />
            <Text style={[styles.capabilityTitle, { color: colors.text }]}>Battery drain analysis</Text>
          </View>
          {drainAnalysis ? (
            <>
              <Text style={[styles.insightValue, { color: colors.text }]}>
                {drainAnalysis.drainPercentPerHour === null ? 'Collecting history' : `${drainAnalysis.drainPercentPerHour.toFixed(1)}% per hour`}
              </Text>
              <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>{drainAnalysis.explanation}</Text>
              <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>
                Coverage: {drainAnalysis.coverage} · {drainAnalysis.sampleCount} samples · {drainAnalysis.elapsedMinutes !== null ? `${Math.round(drainAnalysis.elapsedMinutes)} min window` : 'No valid window'}
              </Text>
              {drainAnalysis.status !== 'insufficient-data' && <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>This is a device-level estimate, not per-app energy attribution. Keep Battery history enabled and collect more unplugged samples for stronger coverage.</Text>}
            </>
          ) : <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>Drain analysis is temporarily unavailable. Existing live battery readings are unaffected.</Text>}
        </View>

        <View style={[styles.hardwareCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.hardwareHeader}>
            <Smartphone size={20} color={colors.primary} />
            <Text style={[styles.capabilityTitle, { color: colors.text }]}>Battery hardware details</Text>
          </View>
          <View style={styles.hardwareGrid}>
            <HardwareValue label="Technology" value={diagnostics?.technology ?? 'Unavailable'} colors={colors} />
            <HardwareValue label="Available charge" value={diagnostics?.remainingChargeMilliAmpHours != null ? `${diagnostics.remainingChargeMilliAmpHours.toLocaleString()} mAh` : 'Unavailable'} colors={colors} />
            <HardwareValue label="Instant current" value={diagnostics?.currentNowMilliAmps != null ? `${Math.abs(diagnostics.currentNowMilliAmps).toLocaleString()} mA ${diagnostics.currentNowMilliAmps > 0 ? 'charging' : diagnostics.currentNowMilliAmps < 0 ? 'discharging' : 'idle'}` : 'Unavailable'} colors={colors} />
            <HardwareValue label="Average current" value={diagnostics?.currentAverageMilliAmps != null ? `${Math.abs(diagnostics.currentAverageMilliAmps).toLocaleString()} mA ${diagnostics.currentAverageMilliAmps > 0 ? 'charging' : diagnostics.currentAverageMilliAmps < 0 ? 'discharging' : 'idle'}` : 'Unavailable'} colors={colors} />
            <HardwareValue label="Energy counter" value={diagnostics?.energyCounterMilliWattHours != null ? `${diagnostics.energyCounterMilliWattHours.toLocaleString()} mWh` : 'Unavailable'} colors={colors} />
            <HardwareValue label="Charge cycles" value={diagnostics?.cycleCount != null ? diagnostics.cycleCount.toLocaleString() : 'Unavailable'} colors={colors} />
          </View>
          <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>
            Readings come from Android BatteryManager. Current is battery-side current, not a measurement of USB adapter input. Hardware and firmware may omit individual values.
          </Text>
        </View>

        <View style={[styles.chargingCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.plugIcon}><PlugZap size={34} color="#3487FF" /></View>
          <View style={styles.chargingCopy}>
            <Text style={[styles.cardEyebrow, { color: colors.textSecondary }]}>CHARGING STATUS</Text>
            <Text style={[styles.chargingValue, { color: colors.text }]}>{getChargingLabel(reading.state)}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: colors.border }]}>
            <Text style={[styles.statusBadgeText, { color: colors.primary }]}>{diagnostics?.plugged && diagnostics.plugged !== 'none-or-unknown' ? diagnostics.plugged : 'Device'}</Text>
          </View>
        </View>

        <View style={[styles.capabilityCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.capabilityHeader}>
            <ShieldCheck size={22} color="#3487FF" />
            <Text style={[styles.capabilityTitle, { color: colors.text }]}>Device capabilities</Text>
            <View style={{ flex: 1 }} />
            <Smartphone size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.capabilityGrid}>
            <Capability label="Platform" value={reading.platform.toUpperCase()} colors={colors} />
            <Capability label="Battery level" value={reading.capabilities.batteryLevel} colors={colors} />
            <Capability label="Battery health" value={reading.capabilities.batteryHealth} colors={colors} />
            <Capability label="Voltage" value={reading.capabilities.voltage} colors={colors} />
            <Capability label="Charging state" value={reading.capabilities.chargingState} colors={colors} />
            <Capability label="Temperature" value={reading.capabilities.temperature} colors={colors} />
            <Capability label="Cycle count" value={reading.capabilities.cycleCount} colors={colors} />
          </View>
          <Text style={[styles.capabilityFootnote, { color: colors.textSecondary }]}>Values are reported by Android when supported by the phone hardware and OS. VoltGuard never invents missing readings.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
        <DashboardAction title="AI Battery Assistant" subtitle="AI service is not connected yet" icon={Bot} color={colors.primary} onPress={() => router.push('/ai_chat' as any)} />
        <DashboardAction title="Power Breakdown" subtitle="View available battery insights" icon={Activity} color={colors.warning} onPress={() => router.push('/(tabs)/breakdown')} />
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({ icon, label, value, hint, colors }: { icon: React.ReactNode; label: string; value: string; hint: string; colors: any }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricHint, { color: colors.textSecondary }]} numberOfLines={1}>{hint}</Text>
    </View>
  );
}

function HardwareValue({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.hardwareValue}>
      <Text style={[styles.hardwareLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.hardwareMetric, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Capability({ label, value, colors }: { label: string; value: string; colors: any }) {
  const available = value === 'available' || value === 'ANDROID' || value === 'IOS' || value === 'WEB';
  return (
    <View style={styles.capabilityItem}>
      <View style={[styles.capabilityDot, { backgroundColor: available ? '#10D69A' : colors.textSecondary }]} />
      <Text style={[styles.capabilityLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.capabilityValue, { color: available ? '#10D69A' : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 2 },
  brandMark: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#102E5D', borderWidth: 1, borderColor: '#2863A8', alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1, gap: 1 },
  greeting: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  appName: { fontSize: 23, fontWeight: '900', letterSpacing: -1 },
  tagline: { fontSize: 11, fontWeight: '600' },
  gaugeSection: { alignItems: 'center', paddingTop: 3, paddingBottom: 3, gap: 3 },
  gaugeLabel: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  gaugeSubLabel: { fontSize: 12, fontWeight: '600' },
  notice: { padding: 13, borderWidth: 1, borderRadius: 14 },
  noticeText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metricCard: { flexGrow: 1, flexBasis: 0, minWidth: 86, borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 5, alignItems: 'center', gap: 7 },
  metricIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#17345B', alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  metricValue: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  metricHint: { fontSize: 9, fontWeight: '600' },
  chargingCard: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  plugIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#38577F', paddingRight: 10 },
  chargingCopy: { flex: 1, gap: 4 },
  cardEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  chargingValue: { fontSize: 17, fontWeight: '900' },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  capabilityCard: { borderWidth: 1, borderRadius: 22, padding: 17, gap: 15 },
  hardwareCard: { borderWidth: 1, borderRadius: 22, padding: 17, gap: 14 },
  insightCard: { borderWidth: 1, borderRadius: 22, padding: 17, gap: 10 },
  insightValue: { fontSize: 21, fontWeight: '900', textTransform: 'capitalize' },
  hardwareHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  hardwareGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  hardwareValue: { width: '50%', gap: 4, paddingRight: 8 },
  hardwareLabel: { fontSize: 11, fontWeight: '600' },
  hardwareMetric: { fontSize: 14, fontWeight: '800' },
  capabilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  capabilityTitle: { fontSize: 16, fontWeight: '900' },
  capabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  capabilityItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 },
  capabilityDot: { width: 7, height: 7, borderRadius: 4 },
  capabilityLabel: { fontSize: 10, fontWeight: '600' },
  capabilityValue: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize', flexShrink: 1 },
  capabilityFootnote: { fontSize: 11, lineHeight: 17 },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginBottom: -6 },
});
