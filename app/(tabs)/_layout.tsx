import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { Home, PieChart, Zap, Clock, Settings, History } from 'lucide-react-native';
import { AnimatedTabIcon } from '../../src/components/navigation/AnimatedTabIcon';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Home} />,
        }}
      />
      <Tabs.Screen
        name="breakdown"
        options={{
          title: 'Breakdown',
          tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={PieChart} />,
        }}
      />
      <Tabs.Screen
        name="presets"
        options={{
          title: 'Presets',
          tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Zap} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={History} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <AnimatedTabIcon focused={focused} icon={Settings} />,
        }}
      />
    </Tabs>
  );
}