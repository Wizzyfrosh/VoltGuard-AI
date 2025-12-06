import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Battery from 'expo-battery';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { BatteryGauge } from '../../src/components/dashboard/BatteryGauge';
import { DashboardAction } from '../../src/components/dashboard/DashboardAction';
import { BellRing, Bot, Activity, Thermometer, Zap } from 'lucide-react-native';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Battery State
  const [batteryLevel, setBatteryLevel] = useState<number>(0.5);
  const [batteryState, setBatteryState] = useState<Battery.BatteryState>(Battery.BatteryState.UNKNOWN);
  const [lowPowerMode, setLowPowerMode] = useState<boolean>(false);

  useEffect(() => {
    let subscription: any;

    const initBattery = async () => {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      const mode = await Battery.isLowPowerModeEnabledAsync();
      
      setBatteryLevel(level);
      setBatteryState(state);
      setLowPowerMode(mode);
    };

    initBattery();

    // Subscribe to updates
    subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(batteryLevel);
    });

    const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
      setBatteryState(batteryState);
    });

    return () => {
      subscription && subscription.remove();
      stateSub && stateSub.remove();
    };
  }, []);

  const isCharging = batteryState === Battery.BatteryState.CHARGING;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good Morning,</Text>
          <Text style={[styles.appName, { color: colors.text }]}>VoltGuard AI</Text>
        </View>

        {/* Top Section - Gauge */}
        <View style={styles.gaugeContainer}>
          <BatteryGauge percentage={batteryLevel} isCharging={isCharging} size={280} />
          
          <View style={[styles.infoPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
               {isCharging ? '⚡ Est. 45 min to full' : 'Usage: ~6h remaining'}
            </Text>
          </View>
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Thermometer size={20} color={colors.warning} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Temp</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>34°C</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Activity size={20} color={colors.success} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Health</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Good</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Zap size={20} color={colors.primary} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Volts</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>4.1V</Text>
          </View>
        </View>

        {/* Actions Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        
        <DashboardAction 
          title="AI Battery Assistant"
          subtitle="Get smart insights & optimization tips"
          icon={Bot}
          color={colors.primary}
          onPress={() => router.push('/ai_chat' as any)}
        />

        <DashboardAction 
          title="Test Alarm Sound"
          subtitle="Preview your 80% charge alert"
          icon={BellRing}
          color={colors.primary}
          onPress={() => { /* TODO: Trigger Sound */ }}
        />

        <DashboardAction 
          title="Power Breakdown"
          subtitle="View app usage consumption"
          icon={Activity}
          color={colors.warning}
          onPress={() => router.push('/(tabs)/breakdown')}
        />

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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  infoPill: {
    marginTop: -20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statusCard: {
    width: '31%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
});