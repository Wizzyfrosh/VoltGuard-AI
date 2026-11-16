import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Battery from 'expo-battery';
import { ArrowLeft, BatteryCharging, BellRing, Bluetooth, CheckCircle2, MapPin, Radio, RefreshCw, Settings2, Sun, Volume2 } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useBatteryTelemetry } from '../src/features/battery/useBatteryTelemetry';
import { useBatteryAlerts } from '../src/features/battery/useBatteryAlerts';
import { resolveChargingHubState } from '../src/features/battery/charging-hub.state';
import { getChargingAlarmStatus, getChargingMonitorStatus, getOptimizationDiagnostics, openChargingNotificationSettings, openOptimizationSetting, sendTestChargingAlarm, type ChargingAlarmStatus, type ChargingMonitorStatus, type OptimizationDiagnostics } from '../modules/voltguard-battery';

type SettingKey = 'brightness' | 'location' | 'bluetooth' | 'nfc' | 'sync';

function Metric({ label, value, note, colors }: { label: string; value: string; note?: string; colors: any }) {
  return <View style={[styles.metric, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    {note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text> : null}
  </View>;
}

function StatusLine({ label, ready, colors }: { label: string; ready: boolean | null; colors: any }) {
  const statusColor = ready == null ? colors.textSecondary : ready ? colors.success : colors.warning;
  return <View style={styles.statusLine}>
    <Text style={[styles.note, { color: colors.textSecondary }]}>{label}</Text>
    <View style={styles.statusValue}>
      {ready === true ? <CheckCircle2 size={14} color={colors.success} /> : null}
      <Text style={[styles.note, { color: statusColor }]}>{ready == null ? 'Unavailable' : ready ? 'Ready' : 'Check settings'}</Text>
    </View>
  </View>;
}

function InfoLine({ label, value, colors }: { label: string; value: string; colors: any }) {
  return <View style={styles.statusLine}>
    <Text style={[styles.note, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.note, { color: colors.text }]}>{value}</Text>
  </View>;
}

export default function ChargingHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const live = useBatteryTelemetry();
  const alerts = useBatteryAlerts(false);
  const [optimization, setOptimization] = useState<OptimizationDiagnostics | null>(null);
  const [alarm, setAlarm] = useState<ChargingAlarmStatus | null>(null);
  const [monitor, setMonitor] = useState<ChargingMonitorStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshing(true);
    try { setOptimization(getOptimizationDiagnostics()); } catch { setOptimization(null); }
    try { setAlarm(getChargingAlarmStatus()); } catch { setAlarm(null); }
    try { setMonitor(getChargingMonitorStatus()); } catch { setMonitor(null); }
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const diagnostic = live.androidDiagnostics;
  const nativeChargingStatus = diagnostic?.status === 'charging'
    || diagnostic?.status === 'discharging'
    || diagnostic?.status === 'full'
    || diagnostic?.status === 'unknown'
    ? diagnostic.status
    : null;
  const chargingState = resolveChargingHubState(
    live.state,
    nativeChargingStatus,
    diagnostic?.plugged == null ? null : diagnostic.plugged !== 'none-or-unknown',
  );
  const { activelyCharging, connected, fullyCharged } = chargingState;
  const status = chargingState.label;

  const updateThreshold = async (value: number) => {
    if (savingTarget || savingAlert || alerts.isLoading || value === alerts.threshold) return;
    setSavingTarget(true);
    setMessage(null);
    try {
      const saved = await alerts.updateThreshold(value);
      setMessage(saved ? 'Charging target saved.' : alerts.monitoringErrorMessage ?? 'Could not update the charging target.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the charging target.');
    } finally {
      setSavingTarget(false);
    }
  };

  const toggleAlert = async () => {
    if (savingAlert || savingTarget || alerts.isLoading) return;
    setSavingAlert(true);
    setMessage(null);
    const wasEnabled = alerts.enabled;
    try {
      const saved = await alerts.updateEnabled(!wasEnabled);
      setMessage(saved ? (wasEnabled ? 'Charging target alert disabled.' : 'Charging target alert enabled.')
        : alerts.monitoringErrorMessage ?? 'Could not update the charging alert.');
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the charging alert.');
    } finally {
      setSavingAlert(false);
    }
  };

  const testAlarm = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const sent = await sendTestChargingAlarm();
      setMessage(sent ? 'Alarm test sent. Check the phone’s notification sound and vibration.' : 'Alarm testing is unavailable on this platform.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send the alarm test.');
    } finally {
      setTesting(false);
    }
  };

  const openSetting = (setting: SettingKey, label: string) => {
    const opened = openOptimizationSetting(setting);
    if (!opened) setMessage('Android could not open this setting on the current device.');
    else setMessage(label + ' settings opened.');
  };

  const settingValue = (value: boolean | null | undefined) => value == null ? 'Unavailable' : value ? 'On' : 'Off';

  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { borderColor: colors.border }]}>
        <ArrowLeft size={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>POWER MANAGEMENT</Text>
        <Text style={[styles.title, { color: colors.text }]}>Charging Hub</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh charging diagnostics" onPress={refresh} style={[styles.back, { borderColor: colors.border }]}>
        {refreshing ? <ActivityIndicator color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
      </Pressable>
    </View>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusHead}>
          <View style={[styles.statusIcon, { backgroundColor: connected ? colors.success + '18' : colors.background }]}>
            <BatteryCharging size={24} color={connected ? colors.success : colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{status}</Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {diagnostic?.plugged && diagnostic.plugged !== 'none-or-unknown' ? 'Power source · ' + diagnostic.plugged : 'Power source unavailable'}
            </Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: connected ? colors.success + '18' : colors.background }]}>
            <Text style={[styles.liveText, { color: connected ? colors.success : colors.textSecondary }]}>{connected ? 'CONNECTED' : fullyCharged ? 'FULL' : 'IDLE'}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <Metric label="Battery level" value={live.level == null ? 'Unavailable' : Math.round(live.level * 100) + '%'} colors={colors} />
          <Metric label="Voltage" value={diagnostic?.voltageMilliVolts == null ? 'Unavailable' : (diagnostic.voltageMilliVolts / 1000).toFixed(2) + ' V'} colors={colors} />
          <Metric label="Instant current" value={diagnostic?.currentNowMilliAmps == null ? 'Unavailable' : diagnostic.currentNowMilliAmps + ' mA'} note="Battery-side current" colors={colors} />
          <Metric label="Average current" value={diagnostic?.currentAverageMilliAmps == null ? 'Unavailable' : diagnostic.currentAverageMilliAmps + ' mA'} note="Battery-side current" colors={colors} />
          <Metric label="Temperature" value={diagnostic?.temperatureCelsius == null ? 'Unavailable' : diagnostic.temperatureCelsius.toFixed(1) + ' °C'} colors={colors} />
          <Metric label="Charge counter" value={diagnostic?.remainingChargeMilliAmpHours == null ? 'Unavailable' : diagnostic.remainingChargeMilliAmpHours + ' mAh'} note="Not design capacity" colors={colors} />
        </View>
        <Text style={[styles.note, { color: colors.textSecondary }]}>Hardware readings are supplied by Android when supported. Battery-side current is not USB charger input current. VoltGuard cannot increase charging wattage or stop charging.</Text>
        {live.diagnosticsObservedAt ? <Text style={[styles.note, { color: colors.textSecondary }]}>Last hardware reading · {new Date(live.diagnosticsObservedAt).toLocaleString()}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHead}><BellRing size={20} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.text }]}>Charging target alert</Text></View>
        <Text style={[styles.note, { color: colors.textSecondary }]}>Choose the battery level at which VoltGuard should alert you. Android background delivery can be affected by notification permissions and manufacturer power restrictions.</Text>
        <View style={styles.targets}>
          {[80, 90, 100].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: alerts.threshold === value, disabled: alerts.isLoading || savingTarget || savingAlert }} disabled={alerts.isLoading || savingTarget || savingAlert || alerts.threshold === value} onPress={() => void updateThreshold(value)}
            style={[styles.target, { borderColor: alerts.threshold === value ? colors.primary : colors.border, backgroundColor: alerts.threshold === value ? colors.primary + '12' : colors.background, opacity: savingTarget || savingAlert ? 0.65 : 1 }]}>
            <Text style={[styles.targetText, { color: alerts.threshold === value ? colors.primary : colors.text }]}>{value}%</Text>
          </Pressable>)}
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: alerts.enabled, disabled: alerts.isLoading || savingAlert || savingTarget }} disabled={alerts.isLoading || savingAlert || savingTarget} onPress={() => void toggleAlert()}
          style={[styles.primaryButton, { backgroundColor: alerts.enabled ? colors.background : colors.primary, borderColor: colors.primary, opacity: savingAlert || savingTarget ? 0.7 : 1 }]}>
          {alerts.isLoading || savingAlert ? <ActivityIndicator color={alerts.enabled ? colors.primary : '#FFFFFF'} /> :
            <Text style={[styles.primaryText, { color: alerts.enabled ? colors.primary : '#FFFFFF' }]}>{alerts.enabled ? 'Disable charging alert' : 'Enable charging alert'}</Text>}
        </Pressable>
        {alerts.monitoringErrorMessage ? <Text style={[styles.note, { color: colors.warning }]}>{alerts.monitoringErrorMessage}</Text> : null}
        {alarm ? <View style={[styles.alarmStatus, { borderTopColor: colors.border }]}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>Alarm channel readiness</Text>
          <StatusLine label="Notifications" ready={alarm.notificationsEnabled} colors={colors} />
          <StatusLine label="Alarm channel" ready={alarm.channelEnabled} colors={colors} />
          <StatusLine label="Foreground monitor enabled" ready={monitor == null ? null : monitor.monitoringEnabled} colors={colors} />
          <StatusLine label="Foreground monitor running" ready={monitor == null ? null : monitor.monitoringRunning} colors={colors} />
          <StatusLine label="High importance" ready={alarm.highImportance} colors={colors} />
          <StatusLine label="Sound configured" ready={alarm.soundEnabled} colors={colors} />
          <StatusLine label="Vibration enabled" ready={alarm.vibrationEnabled} colors={colors} />
          <StatusLine label="Alarm volume" ready={alarm.alarmVolume == null ? null : alarm.alarmVolume > 0} colors={colors} />
          <InfoLine label="Ringer mode" value={alarm.ringerMode ? alarm.ringerMode.replace('_', ' ') : 'Unavailable'} colors={colors} />
          <InfoLine label="Do Not Disturb" value={alarm.doNotDisturb ? alarm.doNotDisturb.replace('_', ' ') : 'Unavailable'} colors={colors} />
          {alarm.alarmVolume === 0 ?
            <Text style={[styles.note, { color: colors.warning }]}>The alarm volume is muted. Increase the alarm stream volume in Android sound settings before relying on audible alerts.</Text> : null}
          {alarm.doNotDisturb === 'priority' || alarm.doNotDisturb === 'total_silence' ?
            <Text style={[styles.note, { color: colors.warning }]}>Do Not Disturb is active. Whether this alarm can interrupt depends on the device's allowed interruption policy; test it on this device.</Text> : null}
          <Pressable accessibilityRole="button" disabled={testing || Platform.OS !== 'android'} onPress={() => void testAlarm()}
            style={[styles.secondaryButton, { borderColor: colors.border, opacity: Platform.OS === 'android' ? 1 : 0.45 }]}>
            {testing ? <ActivityIndicator color={colors.primary} /> : <><Volume2 size={16} color={colors.primary} /><Text style={[styles.smallButtonText, { color: colors.primary }]}>Test alarm sound</Text></>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={Platform.OS !== 'android'} onPress={() => {
            const opened = openChargingNotificationSettings();
            if (!opened) setMessage('Android notification settings could not be opened. Open Settings > Apps > VoltGuard > Notifications manually.');
          }} style={[styles.secondaryButton, { borderColor: colors.border, opacity: Platform.OS === 'android' ? 1 : 0.45 }]}>
            <Settings2 size={16} color={colors.primary} />
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>Notification settings</Text>
          </Pressable>
          {!alarm.alarmReady ? <Text style={[styles.note, { color: colors.warning }]}>Alarm notifications need attention in Android settings.</Text> : null}
        </View> : <Text style={[styles.note, { color: colors.textSecondary }]}>Alarm-channel diagnostics are unavailable on this platform.</Text>}
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.note, { color: colors.primary }]}>{message}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHead}><Settings2 size={20} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.text }]}>Power optimization checks</Text></View>
        <Text style={[styles.note, { color: colors.textSecondary }]}>These checks report Android system settings. Open Settings to make changes; VoltGuard does not silently toggle protected controls.</Text>
        <SettingRow label="Automatic brightness" value={settingValue(optimization?.automaticBrightnessEnabled)} icon={<Sun size={19} color={colors.primary} />} onPress={() => openSetting('brightness', 'Brightness')} colors={colors} />
        <SettingRow label="Location services" value={settingValue(optimization?.locationEnabled)} icon={<MapPin size={19} color={colors.primary} />} onPress={() => openSetting('location', 'Location')} colors={colors} />
        <SettingRow label="Bluetooth" value={settingValue(optimization?.bluetoothEnabled)} icon={<Bluetooth size={19} color={colors.primary} />} onPress={() => openSetting('bluetooth', 'Bluetooth')} colors={colors} />
        <SettingRow label="NFC" value={settingValue(optimization?.nfcEnabled)} icon={<Radio size={19} color={colors.primary} />} onPress={() => openSetting('nfc', 'NFC')} colors={colors} />
        <SettingRow label="Background system sync" value={settingValue(optimization?.masterSyncEnabled)} icon={<RefreshCw size={19} color={colors.primary} />} onPress={() => openSetting('sync', 'Sync')} colors={colors} />
        {Platform.OS !== 'android' ? <Text style={[styles.note, { color: colors.warning }]}>System diagnostics and Settings shortcuts are Android-only. Web and iOS do not expose these controls.</Text> : null}
      </View>
      <View style={[styles.disclaimer, { borderColor: colors.border }]}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>Optimization suggestions are informational. Turning off connectivity, location or sync can affect calls, messages, navigation and app updates. Choose settings based on your needs.</Text>
      </View>
    </ScrollView>
  </View>;
}

function SettingRow({ label, value, icon, onPress, colors }: { label: string; value: string; icon: React.ReactNode; onPress: () => void; colors: any }) {
  return <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
    <View style={styles.settingLeft}>{icon}<View style={{ flex: 1, gap: 3 }}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.note, { color: colors.textSecondary }]}>{value}</Text>
    </View></View>
    <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + label + ' settings'} disabled={Platform.OS !== 'android'} onPress={onPress}
      style={[styles.smallButton, { borderColor: colors.border, opacity: Platform.OS === 'android' ? 1 : 0.45 }]}>
      <Text style={[styles.smallButtonText, { color: colors.primary }]}>Settings</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  back: { width: 42, height: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 22, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 13 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 13 },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  livePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48%', flexGrow: 1, minWidth: 125, borderWidth: 1, borderRadius: 13, padding: 11, gap: 4 },
  metricLabel: { fontSize: 10, fontWeight: '700' },
  metricValue: { fontSize: 15, fontWeight: '900' },
  note: { fontSize: 11, lineHeight: 17 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  targets: { flexDirection: 'row', gap: 9 },
  target: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  targetText: { fontSize: 15, fontWeight: '900' },
  primaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 13, fontWeight: '900' },
  alarmStatus: { gap: 9, paddingTop: 8, borderTopWidth: 1 },
  statusLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secondaryButton: { minHeight: 40, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  smallButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  smallButtonText: { fontSize: 11, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingTitle: { fontSize: 12, fontWeight: '800' },
  disclaimer: { borderWidth: 1, borderRadius: 14, padding: 13 }
});
