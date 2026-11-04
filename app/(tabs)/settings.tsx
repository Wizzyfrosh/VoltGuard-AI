import React from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, Info, Database } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const history = useBatteryHistory();

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
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
