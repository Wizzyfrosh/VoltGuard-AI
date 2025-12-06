import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { PresetCard } from '../../src/components/presets/PresetCard';
import { Zap, Moon, BatteryCharging, Plus } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function PresetsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State for active profile
  const [activePreset, setActivePreset] = useState<string>('optimized');

  const handleToggle = (id: string) => {
    setActivePreset(id);
    // TODO: Save to SQLite
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Smart Charging</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Automate your charging habits to extend battery lifespan.
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(200)}>
          <PresetCard
            id="optimized"
            title="Optimized Health"
            desc="Alerts you to unplug at 80% to reduce chemical aging of the Lithium-Ion battery."
            icon={Activity}
            isActive={activePreset === 'optimized'}
            onToggle={handleToggle}
            threshold={80}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)}>
          <PresetCard
            id="overnight"
            title="Overnight Care"
            desc="Learns your wake-up time. Charges slowly and finishes right before you wake up."
            icon={Moon}
            isActive={activePreset === 'overnight'}
            onToggle={handleToggle}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600)}>
          <PresetCard
            id="fast"
            title="Max Performance"
            desc="Charges to 100% as fast as possible. Useful for long travel days."
            icon={Zap}
            isActive={activePreset === 'fast'}
            onToggle={handleToggle}
            threshold={100}
          />
        </Animated.View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 20 + 75 }]} // 75 is roughly tab bar height
        activeOpacity={0.8}
        onPress={() => alert('Custom Profile Modal coming soon!')}
      >
        <Plus color="#fff" size={28} />
      </TouchableOpacity>
    </View>
  );
}

// Helper icon
import { Activity } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});