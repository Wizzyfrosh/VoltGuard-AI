import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { UsageRow } from '../../src/components/breakdown/UsageRow';
import { Smartphone, Wifi, Cpu, MapPin, Sun, Info } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function BreakdownScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Mock data (Since real per-app data is restricted by OS sandbox)
  const usageData = [
    { id: 1, label: 'Screen On', percentage: 45, icon: Sun, color: '#f59e0b' },
    { id: 2, label: 'Cellular & Wi-Fi', percentage: 22, icon: Wifi, color: '#3b82f6' },
    { id: 3, label: 'System Idle', percentage: 15, icon: Cpu, color: '#64748b' },
    { id: 4, label: 'Location Services', percentage: 12, icon: MapPin, color: '#ef4444' },
    { id: 5, label: 'Background Apps', percentage: 6, icon: Smartphone, color: '#8b5cf6' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={[styles.title, { color: colors.text }]}>Power Usage</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Estimated breakdown since last full charge
        </Text>

        {/* Chart Section */}
        <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {usageData.map((item, index) => (
            <UsageRow 
              key={item.id}
              {...item}
              delay={index * 150} // Staggered animation
            />
          ))}
        </View>

        {/* Tips Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Optimization Tips</Text>
        
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <TouchableOpacity style={[styles.tipCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Info size={24} color={colors.primary} style={styles.tipIcon} />
            <View>
              <Text style={[styles.tipTitle, { color: colors.primary }]}>High Screen Usage</Text>
              <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>
                Your screen is consuming significant power. Try lowering brightness or enabling Dark Mode.
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  chartContainer: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    paddingRight: 8,
  },
});