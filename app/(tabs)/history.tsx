import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Battery from 'expo-battery';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock3, Info, BatteryCharging, BatteryFull, TrendingUp } from 'lucide-react-native';
import { useBatterySessionAnalytics } from '../../src/features/battery/useBatterySessionAnalytics';
import { getObservedLevelChangeRate } from '../../src/features/battery/battery.session.analytics';
import { useTheme } from '../../src/context/ThemeContext';
import { useBatteryHistory } from '../../src/features/battery/useBatteryHistory';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleString();
}

function formatBatteryState(value: number): string {
  if (value === Battery.BatteryState.CHARGING) return 'Charging';
  if (value === Battery.BatteryState.FULL) return 'Full';
  if (value === Battery.BatteryState.UNPLUGGED) return 'On battery';
  return 'Unknown';
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
  const sessionAnalytics = useBatterySessionAnalytics();

  useFocusEffect(useCallback(() => {
    void history.refresh();
    void sessionAnalytics.refresh();
  }, [history.refresh, sessionAnalytics.refresh]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Battery History</Text>
        {history.enabled && (
          <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.comparisonHeader}>
              <TrendingUp size={21} color={colors.primary} />
              <Text style={[styles.heading, { color: colors.text }]}>Charging session comparison</Text>
            </View>
            {sessionAnalytics.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : sessionAnalytics.error ? (
              <Text style={[styles.body, { color: colors.textSecondary }]}>{sessionAnalytics.error}</Text>
            ) : sessionAnalytics.comparison ? (
              <>
                <View style={styles.comparisonColumns}>
                  <View style={styles.comparisonColumn}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Last 7 days</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{sessionAnalytics.comparison.current.sessionCount} sessions</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg gain {sessionAnalytics.comparison.current.averageGainPercent === null ? '—' : sessionAnalytics.comparison.current.averageGainPercent + '%'}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg observed interval {sessionAnalytics.comparison.current.averageDurationMinutes === null ? '—' : formatDuration(sessionAnalytics.comparison.current.averageDurationMinutes * 60000)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Level change {sessionAnalytics.comparison.current.averageLevelChangeRatePercentPerHour === null ? '—' : sessionAnalytics.comparison.current.averageLevelChangeRatePercentPerHour + '%/hr'}</Text>
                  </View>
                  <View style={styles.comparisonColumn}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Previous 7 days</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{sessionAnalytics.comparison.previous.sessionCount} sessions</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg gain {sessionAnalytics.comparison.previous.averageGainPercent === null ? '—' : sessionAnalytics.comparison.previous.averageGainPercent + '%'}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg observed interval {sessionAnalytics.comparison.previous.averageDurationMinutes === null ? '—' : formatDuration(sessionAnalytics.comparison.previous.averageDurationMinutes * 60000)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Level change {sessionAnalytics.comparison.previous.averageLevelChangeRatePercentPerHour === null ? '—' : sessionAnalytics.comparison.previous.averageLevelChangeRatePercentPerHour + '%/hr'}</Text>
                  </View>
                </View>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{sessionAnalytics.comparison.explanation}</Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  {sessionAnalytics.comparison.gainChangePercentPoints === null
                    ? 'Period-to-period change unavailable.'
                    : 'Average gain change: ' + (sessionAnalytics.comparison.gainChangePercentPoints > 0 ? '+' : '') + sessionAnalytics.comparison.gainChangePercentPoints + ' percentage points'}
                </Text>
              </>
            ) : null}
          </View>
        )}
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
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{session.status === 'charging' ? 'Last observed' : 'End'}</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatPercent(session.endLevel)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Observed interval</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatDuration(session.startedAt, session.endedAt)}</Text>
                  </View>
                </View>
                {session.endedAt && (
                  <Text style={[styles.date, { color: colors.textSecondary }]}>Ended {formatDate(session.endedAt)}</Text>
                )}
                {session.status === 'completed' && (
                  <Text style={[styles.source, { color: colors.textSecondary }]}>
                    Observed level change rate: {getObservedLevelChangeRate(session) === null ? 'Unavailable' : getObservedLevelChangeRate(session) + ' percentage points/hour'}
                  </Text>
                )}
                {session.status === 'charging' && (
                  <Text style={[styles.source, { color: colors.textSecondary }]}>Session may be stale if VoltGuard was closed or Android stopped background updates.</Text>
                )}
                <Text style={[styles.source, { color: colors.textSecondary }]}>Elapsed time is between observed states; this is not adapter input current, wattage or a laboratory charging-speed measurement.</Text>
              </View>
            ))}
          </View>
        )}
        {history.enabled && history.samples.some((sample) => sample.level !== null) && (
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent battery level</Text>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>Latest saved foreground observations, oldest to newest. Gaps are not filled.</Text>
            <View style={styles.levelChart}>
              {history.samples.slice(0, 20).reverse().map((sample) => {
                const level = sample.level === null ? null : Math.max(0, Math.min(1, sample.level));
                const height = level === null ? 3 : Math.max(3, level * 88);
                const timeLabel = new Date(sample.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <View key={sample.id} style={styles.levelColumn} accessibilityLabel={level === null ? 'Battery level unavailable at ' + timeLabel : Math.round(level * 100) + ' percent at ' + timeLabel}>
                    <View style={styles.levelBarTrack}>
                      <View style={[styles.levelBar, { height, backgroundColor: level === null ? colors.border : colors.primary, opacity: level === null ? 0.4 : 1 }]} />
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartAxis}>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {history.samples.length ? formatDate(history.samples[Math.min(19, history.samples.length - 1)].observedAt) : ''}
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {history.samples.length ? formatDate(history.samples[0].observedAt) : ''}
              </Text>
            </View>
          </View>
        )}
        {history.enabled && history.samples.length > 0 && (
          <View style={styles.sampleSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent battery readings</Text>
            {history.samples.slice(0, 10).map((sample) => (
              <View key={sample.id} style={[styles.sampleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sampleCopy}>
                  <Text style={[styles.sampleLevel, { color: colors.text }]}>{formatPercent(sample.level)}</Text>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(sample.observedAt)}</Text>
                </View>
                <Text style={[styles.sampleState, { color: colors.textSecondary }]}>{formatBatteryState(sample.batteryState)}</Text>
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
  comparisonCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  comparisonColumns: { flexDirection: 'row', gap: 10 },
  comparisonColumn: { flex: 1, gap: 7, backgroundColor: 'rgba(128,128,128,0.07)', borderRadius: 12, padding: 11 },
  sampleSection: { gap: 10 },
  chartCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  levelChart: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  levelColumn: { flex: 1, height: 92, justifyContent: 'flex-end' },
  levelBarTrack: { height: 92, justifyContent: 'flex-end', alignItems: 'center' },
  levelBar: { width: '70%', minHeight: 3, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  sampleRow: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sampleCopy: { flex: 1, gap: 3 },
  sampleLevel: { fontSize: 16, fontWeight: '700' },
  sampleState: { fontSize: 12, fontWeight: '600' },
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
