import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Home, PieChart, Zap, History, Settings } from 'lucide-react-native';
import { AnimatedTabIcon } from '../../src/components/navigation/AnimatedTabIcon';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Keep the tab bar in normal layout flow. Absolute positioning caused
        // scroll content to render underneath the controls on shorter screens.
        tabBarStyle: {
          height: 66 + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
          marginHorizontal: 12,
          marginTop: 4,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 21,
          elevation: 10,
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarItemStyle: { borderRadius: 15, marginHorizontal: 2 },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 21, backgroundColor: colors.tabBar }]} />,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Home} /> }} />
      <Tabs.Screen name="breakdown" options={{ title: 'Analytics', tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={PieChart} /> }} />
      <Tabs.Screen name="presets" options={{ title: 'Profiles', tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Zap} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={History} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Settings} /> }} />
    </Tabs>
  );
}
