import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, Info } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Settings2 size={30} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.text }]}>Settings are being prepared</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Notification preferences, data controls and appearance settings are not functional yet. They will be added alongside the services they configure.
          </Text>
        </View>
        <View style={styles.note}>
          <Info size={17} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            No setting currently shown in this screen should be interpreted as enabled or saved.
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
