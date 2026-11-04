import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Home, PieChart, Zap, History, Settings } from 'lucide-react-native';
import { AnimatedTabIcon } from '../../src/components/navigation/AnimatedTabIcon';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 8) + 8,
          height: 72,
          paddingTop: 9,
          paddingBottom: 8,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 25,
          elevation: 14,
          shadowColor: '#000000',
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 3 },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
        tabBarBackground: () => <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 25, backgroundColor: colors.tabBar }]} />,
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
