import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock3, Info, BatteryCharging, BatteryFull } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleString();
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${Math.round(value * 100)}%`;
}

function formatDuration(start: string, end: string | null): string {
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return 'Duration unavailable';
  const minutes = Math.floor((endTime - startTime) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const history = useBatteryHistory();

  useFocusEffect(useCallback(() => {
    void history.refresh();
  }, [history.refresh]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Battery History</Text>
        {!history.isAvailable ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Info size={28} color={colors.warning} />
            <Text style={[styles.heading, { color: colors.text }]}>History unavailable</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Local history storage is not supported in this web build. Use the Android or iOS app for local history.
            </Text>
          </View>
        ) : history.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.body, { color: colors.textSecondary }]}>Loading local history…</Text>
          </View>
        ) : !history.enabled ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Clock3 size={30} color={colors.primary} />
            <Text style={[styles.heading, { color: colors.text }]}>Battery history is turned off</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Enable Battery history in Settings to save foreground readings and charging sessions on this device.
            </Text>
          </View>
        ) : history.sessions.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Clock3 size={30} color={colors.primary} />
            <Text style={[styles.heading, { color: colors.text }]}>No charging sessions recorded</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              VoltGuard will show charging sessions after it observes charging-state changes while the app is active.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {history.sessions.map((session) => (
              <View key={session.id} style={[styles.session, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sessionHeader}>
                  {session.status === 'charging'
                    ? <BatteryCharging size={21} color={colors.primary} />
                    : <BatteryFull size={21} color={colors.success} />}
                  <Text style={[styles.sessionTitle, { color: colors.text }]}>
                    {session.status === 'charging' ? 'Charging in progress' : 'Charging session'}
                  </Text>
                </View>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(session.startedAt)}</Text>
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Start</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(session.startLevel)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Latest</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(session.endLevel)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Duration</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatDuration(session.startedAt, session.endedAt)}</Text>
                  </View>
                </View>
                {session.endedAt && (
                  <Text style={[styles.date, { color: colors.textSecondary }]}>Ended {formatDate(session.endedAt)}</Text>
                )}
                <Text style={[styles.source, { color: colors.textSecondary }]}>Inferred from observed device charging state</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.note}>
          <Info size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Session start and end times are based on observations while VoltGuard is active. They may be incomplete if the app is closed or the operating system does not deliver an event.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 110, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center', gap: 12 },
  heading: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  list: { gap: 12 },
  session: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sessionTitle: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metric: { flex: 1, gap: 4 },
  metricLabel: { fontSize: 11 },
  metricValue: { fontSize: 15, fontWeight: '700' },
  source: { fontSize: 11, lineHeight: 16 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
