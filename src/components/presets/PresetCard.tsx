import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { LucideIcon } from 'lucide-react-native';

interface PresetCardProps {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  isActive: boolean;
  onToggle: (id: string) => void;
  threshold?: number;
}

export const PresetCard: React.FC<PresetCardProps> = ({ 
  id, title, desc, icon: Icon, isActive, onToggle, threshold 
}) => {
  const { colors, isDark } = useTheme();
  
  // Animation for background color change
  const progress = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [isDark ? colors.card : colors.background, colors.primary + '10']
    );
    
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.primary]
    );

    return { backgroundColor, borderColor };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: isActive ? colors.primary : colors.border }]}>
          <Icon size={20} color={isActive ? '#fff' : colors.textSecondary} />
        </View>
        <Switch
          value={isActive}
          onValueChange={() => onToggle(id)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={'#fff'}
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{desc}</Text>
      
      {threshold !== undefined && (
        <View style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.tagText, { color: colors.primary }]}>Reminder at {threshold}%</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
});