import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

interface AnimatedTabIconProps {
  focused: boolean;
  icon: React.ElementType;
  size?: number;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({ focused, icon: Icon, size = 24 }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2);
      opacity.value = withTiming(1);
    } else {
      scale.value = withSpring(1);
      opacity.value = withTiming(0.6);
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon 
        size={size} 
        color={focused ? colors.tabBarActive : colors.tabBarInactive} 
        strokeWidth={focused ? 2.5 : 2}
      />
    </Animated.View>
  );
};