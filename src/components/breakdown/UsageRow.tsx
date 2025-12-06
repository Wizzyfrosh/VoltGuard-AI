import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { LucideIcon } from 'lucide-react-native';

interface UsageRowProps {
  label: string;
  percentage: number; // 0 to 100
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export const UsageRow: React.FC<UsageRowProps> = ({ 
  label, 
  percentage, 
  icon: Icon, 
  color,
  delay = 0 
}) => {
  const { colors } = useTheme();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(percentage, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    }));
  }, [percentage]);

  const animatedWidth = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.percentage, { color: colors.textSecondary }]}>{percentage}%</Text>
        </View>
        
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.bar, { backgroundColor: color }, animatedWidth]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  track: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});