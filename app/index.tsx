import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';

export default function SplashScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  // Animations
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Pulse Animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.ease }),
        withTiming(1, { duration: 800, easing: Easing.ease })
      ),
      -1, // Infinite
      true // Reverse
    );

    // Fade In Text
    opacity.value = withTiming(1, { duration: 1500 });

    // Navigate to Dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)/dashboard');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={animatedIconStyle}>
        <Zap size={80} color={colors.primary} fill={colors.primary} />
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={[styles.title, { color: colors.text }]}>VoltGuard</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Smart Charging. Smarter Battery Life.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
  },
});