import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { theme } from '../theme/colors';
import { getBatteryPreference, setBatteryPreference } from '../features/battery/battery.database';

type ThemeType = typeof theme.light;
type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextInterface {
  isDark: boolean;
  colors: ThemeType;
  toggleTheme: () => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const PREFERENCE_KEY = 'appearance_preference_v1';
const ThemeContext = createContext<ThemeContextInterface | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('light');
  const userChangedPreference = useRef(false);

  useEffect(() => {
    let active = true;
    void getBatteryPreference(PREFERENCE_KEY).then(value => {
      if (active && !userChangedPreference.current && (value === 'system' || value === 'light' || value === 'dark')) {
        setThemePreferenceState(value);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    userChangedPreference.current = true;
    setThemePreferenceState(preference);
    void setBatteryPreference(PREFERENCE_KEY, preference).catch(() => undefined);
  }, []);

  const isDark = themePreference === 'system'
    ? systemScheme === 'dark'
    : themePreference === 'dark';
  const colors = useMemo(() => (isDark ? theme.dark : theme.light), [isDark]);
  const toggleTheme = useCallback(() => {
    setThemePreference(isDark ? 'light' : 'dark');
  }, [isDark, setThemePreference]);

  const value = useMemo(
    () => ({ isDark, colors, toggleTheme, themePreference, setThemePreference }),
    [isDark, colors, toggleTheme, themePreference, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
