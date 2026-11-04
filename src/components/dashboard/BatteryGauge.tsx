import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Zap } from 'lucide-react-native';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BatteryGaugeProps {
  /** A normalized battery level between 0 and 1, or null when unavailable. */
  percentage: number | null;
  isCharging: boolean;
  size?: number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({
  percentage,
  isCharging,
  size = 250,
}) => {
  const { colors } = useTheme();
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = percentage === null ? 0 : Math.min(1, Math.max(0, percentage));
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(safePercentage, {
      duration: 700,
      easing: Easing.out(Easing.exp),
    });
  }, [safePercentage, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - circumference * animatedProgress.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="batteryGaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.gradientStart} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.gradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {percentage !== null && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isCharging ? colors.charging : 'url(#batteryGaugeGradient)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={styles.centerContent}>
        {isCharging && percentage !== null && (
          <View style={styles.chargingIcon}>
            <Zap size={28} color={colors.charging} fill={colors.charging} />
          </View>
        )}
        <Text style={[styles.percentage, { color: colors.text }]}>
          {percentage === null ? '—' : `${Math.round(safePercentage * 100)}%`}
        </Text>
        <Text style={[styles.status, { color: colors.textSecondary }]}>
          {percentage === null ? 'Battery level unavailable' : isCharging ? 'Charging' : 'Not charging'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  centerContent: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  chargingIcon: { marginBottom: 8 },
  percentage: { fontSize: 48, fontWeight: '800' },
  status: { fontSize: 14, marginTop: 4, fontWeight: '500', textAlign: 'center' },
});
