import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { PresetCard } from '../../src/components/presets/PresetCard';
import { Zap, Moon, Activity } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function PresetsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activePreset, setActivePreset] = useState<string | null>('optimized');

  const handleSelect = (id: string) => setActivePreset((current) => current === id ? null : id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Charging Profiles</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a reminder preference. These profiles do not control charging hardware or change charging speed.
          </Text>
        </View>
        <View style={[styles.disclaimer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Profile selection is currently temporary and resets when the app restarts. Notifications and profile automation are not implemented yet.
          </Text>
        </View>
        <Animated.View entering={FadeInUp.delay(100)}>
          <PresetCard id="optimized" title="80% Reminder" desc="A future reminder preference for users who want to unplug around 80%." icon={Activity} isActive={activePreset === 'optimized'} onToggle={handleSelect} threshold={80} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200)}>
          <PresetCard id="overnight" title="Overnight Reminder" desc="A future reminder preference for overnight charging routines. It cannot slow charging or schedule the device's charging controller." icon={Moon} isActive={activePreset === 'overnight'} onToggle={handleSelect} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300)}>
          <PresetCard id="full" title="Full Charge Reminder" desc="A future reminder preference for users who want a notification when the operating system reports a full battery." icon={Zap} isActive={activePreset === 'full'} onToggle={handleSelect} threshold={100} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  disclaimer: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  disclaimerText: { fontSize: 13, lineHeight: 19 },
});
