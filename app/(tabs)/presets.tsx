import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryAlerts } from '../../src/features/battery/useBatteryAlerts';
import { BatteryCharging, Moon, Zap, CheckCircle2, BellRing } from 'lucide-react-native';

export default function PresetsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const alerts = useBatteryAlerts(false);
  const [busyThreshold, setBusyThreshold] = useState<number | null>(null);

  const applyProfile = async (threshold: number) => {
    setBusyThreshold(threshold);
    try {
      if (alerts.enabled && alerts.threshold === threshold) {
        await alerts.updateEnabled(false);
        return;
      }
      const saved = await alerts.updateThreshold(threshold);
      if (!saved) return;
      if (!alerts.enabled) await alerts.updateEnabled(true);
    } finally {
      setBusyThreshold(null);
    }
  };

  const profiles = [
    { threshold: 80, title: 'Balanced protection', subtitle: 'Get a reminder at 80% while connected to power.', icon: BatteryCharging },
    { threshold: 100, title: 'Full charge reminder', subtitle: 'Get a reminder when Android reports a full battery.', icon: Zap },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>CHARGING AUTOMATION</Text>
          <Text style={[styles.title, { color: colors.text }]}>Charging profiles</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose one real notification target. VoltGuard reminds you; it cannot control or stop the phone&apos;s charging hardware.</Text>
        </View>
        {alerts.isLoading ? <ActivityIndicator color={colors.primary} /> : profiles.map(({ threshold, title, subtitle, icon: Icon }) => {
          const selected = alerts.enabled && alerts.threshold === threshold;
          const loading = busyThreshold === threshold;
          return (
            <Pressable key={threshold} accessibilityRole="button" accessibilityState={{ selected, disabled: loading }}
              onPress={() => void applyProfile(threshold)}
              style={[styles.profile, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: selected ? colors.primary : colors.background }]}>
                <Icon size={23} color={selected ? '#FFFFFF' : colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.profileTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{subtitle}</Text>
                <Text style={[styles.target, { color: colors.primary }]}>Alert threshold · {threshold}%</Text>
              </View>
              {loading ? <ActivityIndicator color={colors.primary} /> : selected ? <CheckCircle2 size={23} color={colors.primary} /> : <View style={[styles.radio, { borderColor: colors.border }]} />}
            </Pressable>
          );
        })}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BellRing size={21} color={colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{alerts.enabled ? 'Charging alert is enabled' : 'Charging alert is disabled'}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {alerts.monitoringError ? 'Android could not start the background monitor. Check notification permission and battery restrictions in system settings.' :
               alerts.permissionDenied ? 'Notification permission is denied. Allow notifications for VoltGuard in Android settings.' :
               alerts.enabled ? `Android is configured to notify at ${alerts.threshold}% while charging.` : 'Select a profile to enable the charging reminder.'}
            </Text>
          </View>
        </View>
        {alerts.permissionDenied && <Text style={[styles.error, { color: colors.warning }]}>Notification permission is required for the alert to be visible.</Text>}
        {!alerts.isAvailable && <Text style={[styles.error, { color: colors.warning }]}>Charging alerts are unavailable on web.</Text>}
        <View style={styles.note}>
          <Moon size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>Android background monitoring uses an ongoing foreground-service notification. Delivery can still be restricted by force-stop, OEM power management or revoked notification permission. iOS supports checks only while the app is open.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 18, gap: 14 },
  header: { gap: 6, marginBottom: 4 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 18, padding: 15 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  profileTitle: { fontSize: 15, fontWeight: '800' },
  description: { fontSize: 12, lineHeight: 17 },
  target: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2 },
  statusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 17, padding: 15, marginTop: 3 },
  statusTitle: { fontSize: 14, fontWeight: '800' },
  error: { fontSize: 12, lineHeight: 18 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 3 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
