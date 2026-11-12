import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';

const options = [
  { value: 'system', label: 'System', description: 'Follow your device appearance' },
  { value: 'light', label: 'Light', description: 'Use the light appearance' },
  { value: 'dark', label: 'Dark', description: 'Use the dark appearance' },
] as const;

export default function OtherSettingsScreen() {
  const { colors, themePreference, setThemePreference } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 30 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Other settings</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose how VoltGuard looks on this device.</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        {options.map(option => {
          const selected = themePreference === option.value;
          return (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }}
              onPress={() => setThemePreference(option.value)}
              style={[styles.option, { borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary + '12' : 'transparent' }]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{option.label}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{option.description}</Text>
              </View>
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textSecondary }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  option: { minHeight: 62, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
