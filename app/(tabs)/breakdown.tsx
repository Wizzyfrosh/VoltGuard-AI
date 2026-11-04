import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Info, Battery, Smartphone } from 'lucide-react-native';

export default function BreakdownScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Power Usage</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Reliable power attribution is not available through the current cross-platform APIs.
        </Text>
        <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Battery size={28} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>No verified usage breakdown yet</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            VoltGuard does not currently have access to per-app or component-level battery consumption data. The percentages shown in the prototype were sample values, not measurements from this device, so they have been removed.
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Info size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>What comes next</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Future versions can provide transparent estimates from locally collected battery-level and charging-session observations. They will be labelled as estimates and will not claim to identify exact app-level drain.
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
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 12 },
  infoContent: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
});
