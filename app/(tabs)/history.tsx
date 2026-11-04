import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock3, Info } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Battery History</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Clock3 size={30} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.text }]}>History is not available yet</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            VoltGuard has not started recording battery samples or charging sessions. Historical charts will appear after local data collection is implemented and enough readings have been recorded.
          </Text>
        </View>
        <View style={styles.note}>
          <Info size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            No historical measurements are being generated or displayed as real data.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center', gap: 12 },
  heading: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
