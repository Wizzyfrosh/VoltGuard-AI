import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const Dot = ({ delay, color }: { delay: number; color: string }) => {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 600, easing: Easing.ease }),
        -1,
        true
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-4, { duration: 600, easing: Easing.ease }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View 
      style={[
        styles.dot, 
        { backgroundColor: color }, 
        animatedStyle
      ]} 
    />
  );
};

export const TypingIndicator = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Dot delay={0} color={colors.textSecondary} />
      <Dot delay={200} color={colors.textSecondary} />
      <Dot delay={400} color={colors.textSecondary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    width: 60,
    justifyContent: 'space-between',
    marginLeft: 16,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});