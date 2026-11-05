import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet, Switch, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, Info, Database, BellRing } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';
import { useBatteryAlerts } from '../../src/features/battery/useBatteryAlerts';
import { useBatteryCareReminder } from '../../src/features/battery/useBatteryCareReminder';
import { getChargingAlarmReadiness, sendChargingAlarmTest } from '../../src/features/battery/battery.alerts';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const history = useBatteryHistory();
  const alerts = useBatteryAlerts(false);
  const careReminder = useBatteryCareReminder();
  const [alarmTestMessage, setAlarmTestMessage] = useState<string | null>(null);
  const [alarmTestBusy, setAlarmTestBusy] = useState(false);

  const handleHistoryChange = async (enabled: boolean) => {
    await history.updateEnabled(enabled);
  };

  const handleAlertChange = async (enabled: boolean) => {
    await alerts.updateEnabled(enabled);
  };

  const handleAlarmTest = async () => {
    setAlarmTestBusy(true);
    setAlarmTestMessage(null);
    try {
      const sent = await sendChargingAlarmTest();
      setAlarmTestMessage(sent
        ? 'Test alert sent. Confirm that your phone played the alarm sound and vibration.'
        : 'The native alarm test is available in the Android app only.');
    } catch (error) {
      setAlarmTestMessage(error instanceof Error ? error.message : 'Could not send the alarm test.');
    } finally {
      setAlarmTestBusy(false);
    }
  };

  let alarmReadiness: ReturnType<typeof getChargingAlarmReadiness> = null;
  if (Platform.OS === 'android') {
    try { alarmReadiness = getChargingAlarmReadiness(); } catch { alarmReadiness = null; }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Database size={22} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Battery history</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Save battery readings and infer charging sessions locally on this device.
              </Text>
            </View>
            {history.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={history.enabled}
                onValueChange={handleHistoryChange}
                disabled={!history.isAvailable}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Enable local battery history"
              />
            )}
          </View>
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>
            Optional and off by default. Only foreground readings are recorded. Data stays on this device and is retained for up to 30 days. Turning this off deletes saved samples and charging sessions.
          </Text>
          {!history.isAvailable && (
            <Text style={[styles.error, { color: colors.warning }]}>
              Local history storage is unavailable here. Browser-based history storage will be added separately; no readings are being saved.
            </Text>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Info size={22} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Charging target alert</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Get a notification when charging reaches your chosen level.</Text>
            </View>
            {alerts.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <Switch value={alerts.enabled} onValueChange={handleAlertChange} disabled={!alerts.isAvailable}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF"
                accessibilityLabel="Enable charging target notification" />
            )}
          </View>
          {Platform.OS === 'android' && (
            <View style={[styles.alarmPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={styles.row}>
                <BellRing size={19} color={colors.primary} />
                <View style={styles.copy}>
                  <Text style={[styles.heading, { color: colors.text }]}>Audible alarm</Text>
                  <Text style={[styles.privacy, { color: colors.textSecondary }]}>
                    {alarmReadiness?.alarmReady
                      ? 'High-priority alarm channel is enabled with sound. Android volume, Do Not Disturb and manufacturer settings can still silence it.'
                      : 'Alarm sound readiness has not been confirmed. Check the channel settings before relying on this alert.'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => { void handleAlarmTest(); }}
                disabled={alarmTestBusy}
                accessibilityRole="button"
                style={[styles.testButton, { backgroundColor: colors.primary, opacity: alarmTestBusy ? 0.6 : 1 }]}
              >
                {alarmTestBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.testButtonText}>Test alarm sound</Text>}
              </Pressable>
              {alarmTestMessage && <Text style={[styles.privacy, { color: colors.textSecondary }]}>{alarmTestMessage}</Text>}
            </View>
          )}
          <Text style={[styles.body, { color: colors.textSecondary }]}>Notify me at</Text>
          <View style={styles.thresholds}>
            {[70, 80, 85, 90, 95, 100].map((value) => (
              <Pressable key={value} disabled={!alerts.isAvailable} onPress={() => { void alerts.updateThreshold(value); }}
                accessibilityRole="button" accessibilityState={{ selected: alerts.threshold === value }}
                style={[styles.thresholdButton, { borderColor: alerts.threshold === value ? colors.primary : colors.border,
                  backgroundColor: alerts.threshold === value ? colors.primary : 'transparent' }]}>
                <Text style={{ color: alerts.threshold === value ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{value}%</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>{Platform.OS === 'android' ? 'An ongoing notification stays visible while background monitoring is active, including when the screen is off. Monitoring is restored after device restart where Android permits it. Force-stop, battery restrictions, or manufacturer power management can still interrupt delivery.' : Platform.OS === 'ios' ? 'iOS checks battery thresholds only while VoltGuard is open; continuous background battery monitoring is not available.' : 'Web testing uses browser battery APIs where supported and sends notifications only while this page is open. Browser support varies; closing the tab stops monitoring.'} This is a reminder only: VoltGuard cannot stop or limit charging.</Text>
          {alerts.monitoringError && (
            <View style={[styles.errorPanel, { borderColor: colors.warning }]}>
              <Text style={[styles.error, { color: colors.warning, fontWeight: '700' }]}>Background monitoring failed</Text>
              <Text selectable style={[styles.error, { color: colors.textSecondary }]}>
                {alerts.monitoringErrorMessage ?? 'Android did not provide a reason. Rebuild and reinstall the latest VoltGuard APK, then retry.'}
              </Text>
              <Text style={[styles.error, { color: colors.textSecondary }]}>
                On OPPO devices, also check Settings → Battery → App battery management and allow VoltGuard to run in the background.
              </Text>
            </View>
          )}
          {alerts.permissionDenied && <Text style={[styles.error, { color: colors.warning }]}>Notification permission was not granted. Enable notifications for VoltGuard in your device settings.</Text>}
          
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <BellRing size={22} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.heading, { color: colors.text }]}>Daily battery-care reminder</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                A gentle daily notification to review battery temperature, charging habits and battery activity.
              </Text>
            </View>
            {careReminder.isLoading ? <ActivityIndicator color={colors.primary} /> : (
              <Switch
                value={careReminder.enabled}
                onValueChange={(value) => { void careReminder.updateEnabled(value); }}
                disabled={Platform.OS === 'web'}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Enable daily battery-care reminder"
              />
            )}
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Reminder time</Text>
          <View style={styles.thresholds}>
            {(['07:00', '12:00', '20:00'] as const).map((value) => (
              <Pressable
                key={value}
                disabled={Platform.OS === 'web' || careReminder.isLoading}
                onPress={() => { void careReminder.updateTime(value); }}
                accessibilityRole="button"
                accessibilityState={{ selected: careReminder.time === value }}
                style={[styles.thresholdButton, {
                  borderColor: careReminder.time === value ? colors.primary : colors.border,
                  backgroundColor: careReminder.time === value ? colors.primary : 'transparent',
                  opacity: Platform.OS === 'web' ? 0.5 : 1,
                }]}
              >
                <Text style={{ color: careReminder.time === value ? '#FFFFFF' : colors.text, fontWeight: '700' }}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>
            Uses your device&apos;s local notification scheduler. It does not require an account or send battery data to a server. Android and iOS may delay notifications because of battery-saving or Focus settings.
          </Text>
          {Platform.OS === 'web' && (
            <Text style={[styles.error, { color: colors.warning }]}>
              Scheduled reminders while the browser is closed are not supported in this web build. Configure this on your phone in the installed app.
            </Text>
          )}
          {careReminder.error && (
            <Text style={[styles.error, { color: colors.warning }]}>{careReminder.error}</Text>
          )}
        </View>
        <View style={styles.note}>
          <Info size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Background monitoring runs only when charging alerts are enabled. Battery history remains foreground-only; no cloud upload is performed.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Settings2 size={22} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.text }]}>Other settings</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Additional appearance controls will be added in a later update.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 18, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
  privacy: { fontSize: 12, lineHeight: 18 },
  error: { fontSize: 12, lineHeight: 18 },
  errorPanel: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 6 },
  thresholds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alarmPanel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  testButton: { minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  testButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  thresholdButton: { minWidth: 48, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
