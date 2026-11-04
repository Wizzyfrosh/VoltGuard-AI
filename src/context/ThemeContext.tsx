import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { theme } from '../theme/colors';

type ThemeType = typeof theme.light;
type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextInterface {
  isDark: boolean;
  colors: ThemeType;
  toggleTheme: () => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextInterface | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const isDark = themePreference === 'system'
    ? systemScheme === 'dark'
    : themePreference === 'dark';

  const colors = useMemo(() => (isDark ? theme.dark : theme.light), [isDark]);

  const toggleTheme = () => {
    setThemePreference(isDark ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({ isDark, colors, toggleTheme, themePreference, setThemePreference }),
    [isDark, colors, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
