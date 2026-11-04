import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Battery from 'expo-battery';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { BatteryGauge } from '../../src/components/dashboard/BatteryGauge';
import { DashboardAction } from '../../src/components/dashboard/DashboardAction';
import { useBatteryTelemetry } from '../../src/features/battery/useBatteryTelemetry';
import { Bot, Activity, Thermometer, Zap } from 'lucide-react-native';

function getChargingLabel(state: Battery.BatteryState): string {
  switch (state) {
    case Battery.BatteryState.CHARGING: return 'Charging';
    case Battery.BatteryState.FULL: return 'Fully charged';
    case Battery.BatteryState.UNPLUGGED: return 'On battery';
    default: return 'Status unavailable';
  }
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reading = useBatteryTelemetry();
  const isCharging = reading.state === Battery.BatteryState.CHARGING;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Device overview</Text>
          <Text style={[styles.appName, { color: colors.text }]}>VoltGuard AI</Text>
        </View>
        <View style={styles.gaugeContainer}>
          <BatteryGauge percentage={reading.level} isCharging={isCharging} size={280} />
          <View style={[styles.infoPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>{getChargingLabel(reading.state)}</Text>
          </View>
        </View>
        {reading.hasError && (
          <Text style={[styles.notice, { color: colors.warning }]}>
            Some battery information is unavailable on this device or platform. Available readings will continue to update.
          </Text>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Thermometer size={20} color={colors.warning} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Temperature</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Not supported</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Activity size={20} color={colors.success} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Battery health</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Not supported</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Zap size={20} color={colors.primary} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Voltage</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Not supported</Text>
          </View>
        </View>
        <View style={[styles.capabilityNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>Device capabilities</Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Current platform: {reading.platform}. Battery level: {reading.capabilities.batteryLevel}. Charging state: {reading.capabilities.chargingState}.
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Advanced diagnostics require platform-specific native integrations and are not enabled in this build.
          </Text>
          {reading.lowPowerMode !== null && (
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Low Power Mode: {reading.lowPowerMode ? 'On' : 'Off'}
            </Text>
          )}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <DashboardAction title="AI Battery Assistant" subtitle="AI service is not connected yet" icon={Bot} color={colors.primary} onPress={() => router.push('/ai_chat' as any)} />
        <DashboardAction title="Power Breakdown" subtitle="View available battery insights" icon={Activity} color={colors.warning} onPress={() => router.push('/(tabs)/breakdown')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 16, fontWeight: '500' },
  appName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  gaugeContainer: { alignItems: 'center', marginBottom: 32 },
  infoPill: { marginTop: -20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, zIndex: 10 },
  infoText: { fontSize: 14, fontWeight: '700' },
  notice: { fontSize: 13, lineHeight: 19, marginBottom: 18, textAlign: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  statusCard: { flex: 1, minWidth: 0, padding: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 5 },
  statusLabel: { fontSize: 11, textAlign: 'center' },
  statusValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  capabilityNote: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 30, gap: 6 },
  noteTitle: { fontSize: 15, fontWeight: '700' },
  noteText: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
});
