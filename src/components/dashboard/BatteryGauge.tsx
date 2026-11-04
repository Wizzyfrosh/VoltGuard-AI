import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { BatteryCharging, BatteryFull } from 'lucide-react-native';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BatteryGaugeProps {
  percentage: number | null;
  isCharging: boolean;
  size?: number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({ percentage, isCharging, size = 300 }) => {
  const { colors } = useTheme();
  const strokeWidth = Math.max(18, size * 0.055);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = percentage === null ? 0 : Math.min(1, Math.max(0, percentage));
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(safePercentage, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [safePercentage, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - circumference * animatedProgress.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="batteryGaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.gradientStart} />
            <Stop offset="1" stopColor={colors.gradientEnd} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        {percentage !== null && (
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="url(#batteryGaugeGradient)" strokeWidth={strokeWidth}
            strokeLinecap="round" fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps} rotation="-90" origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={styles.centerContent}>
        {percentage !== null && (isCharging
          ? <BatteryCharging size={Math.round(size * 0.12)} color={colors.success} />
          : <BatteryFull size={Math.round(size * 0.12)} color={colors.success} />)}
        <Text style={[styles.percentage, { color: colors.text, fontSize: size * 0.19 }]}>
          {percentage === null ? '—' : `${Math.round(safePercentage * 100)}%`}
        </Text>
        <View style={[styles.statePill, { backgroundColor: '#073D3B', borderColor: '#087A69' }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.status, { color: colors.success }]}>
            {percentage === null ? 'Waiting for battery data' : isCharging ? 'Charging' : 'Battery healthy'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  centerContent: { position: 'absolute', justifyContent: 'center', alignItems: 'center', gap: 8 },
  percentage: { fontWeight: '800', letterSpacing: -2 },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 24, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 13, fontWeight: '800' },
});
