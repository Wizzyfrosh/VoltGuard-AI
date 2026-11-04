import React from 'react';
import { Pressable } from 'react-native';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, Info, Database } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';
import { useBatteryAlerts } from '../../src/features/battery/useBatteryAlerts';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const history = useBatteryHistory();
  const alerts = useBatteryAlerts();

  const handleHistoryChange = async (enabled: boolean) => {
    await history.updateEnabled(enabled);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
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
              Local history storage is unavailable on this platform or device.
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
          <Text style={[styles.body, { color: colors.textSecondary }]}>Notify me at</Text>
          <View style={styles.thresholds}>
            {[70, 80, 85, 90, 95, 100].map((value) => (
              <Pressable key={value} onPress={() => { void alerts.updateThreshold(value); }}
                accessibilityRole="button" accessibilityState={{ selected: alerts.threshold === value }}
                style={[styles.thresholdButton, { borderColor: alerts.threshold === value ? colors.primary : colors.border,
                  backgroundColor: alerts.threshold === value ? colors.primary : 'transparent' }]}>
                <Text style={{ color: alerts.threshold === value ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{value}%</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>Alerts are checked while VoltGuard is open. Background alerts are not guaranteed. This is a reminder only: VoltGuard cannot stop or limit charging. Unplug the charger yourself when notified.</Text>
          {alerts.permissionDenied && <Text style={[styles.error, { color: colors.warning }]}>Notification permission was not granted. Enable notifications for VoltGuard in your device settings.</Text>}
          {!alerts.isAvailable && <Text style={[styles.error, { color: colors.warning }]}>Charging alerts are not available on web.</Text>}
        </View>
        <View style={styles.note}>
          <Info size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Automatic background collection and cloud uploads are not enabled.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Settings2 size={22} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.text }]}>Other settings</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Notification preferences and additional appearance controls will be added when their features are implemented.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
  privacy: { fontSize: 12, lineHeight: 18 },
  error: { fontSize: 12, lineHeight: 18 },
  thresholds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },\n  thresholdButton: { minWidth: 48, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 },\n  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
