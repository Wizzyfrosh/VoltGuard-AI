import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Zap } from 'lucide-react-native';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BatteryGaugeProps {
  percentage: number; // 0 to 1
  isCharging: boolean;
  size?: number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({ 
  percentage, 
  isCharging, 
  size = 250 
}) => {
  const { colors } = useTheme();
  
  // Math for circle
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animation value
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(percentage, {
      duration: 1500,
      easing: Easing.out(Easing.exp),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const getBatteryColor = () => {
    if (isCharging) return colors.charging;
    if (percentage < 0.2) return colors.danger;
    if (percentage < 0.5) return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.gradientStart} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.gradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Foreground Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isCharging ? colors.charging : "url(#grad)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center Content */}
      <View style={styles.centerContent}>
        {isCharging && (
          <Animated.View style={{ marginBottom: 8 }}>
            <Zap size={32} color={colors.charging} fill={colors.charging} />
          </Animated.View>
        )}
        <Text style={[styles.percentage, { color: colors.text }]}>
          {Math.round(percentage * 100)}%
        </Text>
        <Text style={[styles.status, { color: colors.textSecondary }]}>
          {isCharging ? 'Charging' : 'Discharging'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 48,
    fontWeight: '800',
  },
  status: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
});