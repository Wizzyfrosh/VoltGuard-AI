import React, { useState } from 'react';
import { Alert, Pressable, View, Text, StyleSheet, Switch, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Info, Database, BellRing, Shield, Settings2 } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';
import { clearBatteryHistory } from '../../src/features/battery/battery.history';
import { useBatteryAlerts } from '../../src/features/battery/useBatteryAlerts';
import { useBatteryCareReminder } from '../../src/features/battery/useBatteryCareReminder';
import { getChargingAlarmReadiness, sendChargingAlarmTest } from '../../src/features/battery/battery.alerts';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useBatteryHistory();
  const alerts = useBatteryAlerts(false);
  const careReminder = useBatteryCareReminder();
  const [alarmTestBusy, setAlarmTestBusy] = useState(false);
  const [alarmTestMessage, setAlarmTestMessage] = useState<string | null>(null);

  const handleAlarmTest = async () => {
    setAlarmTestBusy(true);
    setAlarmTestMessage(null);
    try {
      const sent = await sendChargingAlarmTest();
      setAlarmTestMessage(sent ? 'Test notification sent.' : 'Available in the Android app.');
    } catch (error) {
      setAlarmTestMessage(error instanceof Error ? error.message : 'Could not send test notification.');
    } finally {
      setAlarmTestBusy(false);
    }
  };

  let alarmReadiness: ReturnType<typeof getChargingAlarmReadiness> = null;
  if (Platform.OS === 'android') {
    try { alarmReadiness = getChargingAlarmReadiness(); } catch { alarmReadiness = null; }
  }

  const open = (path: string) => router.push(path as never);
  const Row = ({ icon: Icon, title, subtitle, onPress }: {
    icon: typeof Settings2; title: string; subtitle: string; onPress: () => void;
  }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.navRow, { borderColor: colors.border }]}>
      <Icon size={21} color={colors.primary} />
      <View style={styles.copy}>
        <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={19} color={colors.textSecondary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 28 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Database size={21} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Battery history</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Save readings on this device</Text>
            </View>
            {history.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <Switch value={history.enabled} onValueChange={value => { void history.updateEnabled(value); }} disabled={!history.isAvailable}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF"
                accessibilityLabel="Enable battery history" />
            )}
          </View>
          {history.enabled && history.isAvailable && (
            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('Clear battery history?', 'Saved readings and charging sessions will be deleted from this device.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear history', style: 'destructive', onPress: () => {
                  void clearBatteryHistory().then(() => history.refresh()).catch(() =>
                    Alert.alert('Unable to clear history', 'Please try again.')
                  );
                } },
              ])}
              style={[styles.outlineButton, { borderColor: colors.warning }]}
            >
              <Text style={{ color: colors.warning, fontWeight: '700' }}>Clear saved history</Text>
            </Pressable>
          )}
          {!history.isAvailable && <Text style={[styles.caption, { color: colors.textSecondary }]}>History storage is unavailable on this platform.</Text>}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <BellRing size={21} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Charging target alert</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Notify when your selected level is reached</Text>
            </View>
            {alerts.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <Switch value={alerts.enabled} onValueChange={value => { void alerts.updateEnabled(value); }} disabled={!alerts.isAvailable}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF"
                accessibilityLabel="Enable charging target alert" />
            )}
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Alert at</Text>
          <View style={styles.thresholds}>
            {[70, 80, 85, 90, 95, 100].map(value => (
              <Pressable key={value} disabled={!alerts.isAvailable} onPress={() => { void alerts.updateThreshold(value); }}
                accessibilityRole="button" accessibilityState={{ selected: alerts.threshold === value }}
                style={[styles.thresholdButton, { borderColor: alerts.threshold === value ? colors.primary : colors.border,
                  backgroundColor: alerts.threshold === value ? colors.primary : 'transparent' }]}>
                <Text style={{ color: alerts.threshold === value ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{value}%</Text>
              </Pressable>
            ))}
          </View>
          {Platform.OS === 'android' && (
            <View style={[styles.inlinePanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={[styles.heading, { color: colors.text }]}>Alarm sound</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>
                    {alarmReadiness?.alarmReady ? 'Sound channel enabled' : 'Check notification sound settings'}
                  </Text>
                </View>
                <Pressable onPress={() => { void handleAlarmTest(); }} disabled={alarmTestBusy}
                  style={[styles.smallButton, { backgroundColor: colors.primary, opacity: alarmTestBusy ? 0.6 : 1 }]}>
                  {alarmTestBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.smallButtonText}>Test</Text>}
                </Pressable>
              </View>
              {alarmTestMessage && <Text style={[styles.caption, { color: colors.textSecondary }]}>{alarmTestMessage}</Text>}
            </View>
          )}
          {alerts.monitoringError && <Text style={[styles.caption, { color: colors.warning }]}>Background alert could not start. Check notification permission and battery settings.</Text>}
          {alerts.permissionDenied && <Text style={[styles.caption, { color: colors.warning }]}>Enable VoltGuard notifications in device settings.</Text>}
          <Text style={[styles.caption, { color: colors.textSecondary }]}>Alerts are reminders; charging is not stopped automatically.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <BellRing size={21} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Daily battery-care reminder</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>A daily notification at your chosen time</Text>
            </View>
            {careReminder.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <Switch value={careReminder.enabled} onValueChange={value => { void careReminder.updateEnabled(value); }}
                disabled={Platform.OS === 'web'} trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF" accessibilityLabel="Enable daily battery-care reminder" />
            )}
          </View>
          <View style={styles.thresholds}>
            {(['07:00', '12:00', '20:00'] as const).map(value => (
              <Pressable key={value} disabled={Platform.OS === 'web' || careReminder.isLoading}
                onPress={() => { void careReminder.updateTime(value); }}
                accessibilityRole="button" accessibilityState={{ selected: careReminder.time === value }}
                style={[styles.thresholdButton, { borderColor: careReminder.time === value ? colors.primary : colors.border,
                  backgroundColor: careReminder.time === value ? colors.primary : 'transparent' }]}>
                <Text style={{ color: careReminder.time === value ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{value}</Text>
              </Pressable>
            ))}
          </View>
          {careReminder.error && <Text style={[styles.caption, { color: colors.warning }]}>{careReminder.error}</Text>}
          {Platform.OS === 'web' && <Text style={[styles.caption, { color: colors.textSecondary }]}>Scheduled reminders are available in the mobile app.</Text>}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon={Shield} title="Anti-Theft protection" subtitle="Arm charger-disconnect protection and secure alarm controls" onPress={() => open('/anti-theft')} />
          <Row icon={Shield} title="Permission centre" subtitle="Review notification and optional Usage Access" onPress={() => open('/permission-center')} />
          <Row icon={Info} title="Setup guide" subtitle="Review the introduction and permission setup" onPress={() => open('/onboarding')} />
          <Row icon={Settings2} title="Other settings" subtitle="Appearance and app preferences" onPress={() => open('/settings/other')} />
          <Row icon={Shield} title="Privacy & Legal" subtitle="Privacy, terms and app information" onPress={() => open('/legal')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 18, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  heading: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 17 },
  thresholds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thresholdButton: { minWidth: 48, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 },
  inlinePanel: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 8 },
  smallButton: { minWidth: 66, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  smallButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  outlineButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
});
