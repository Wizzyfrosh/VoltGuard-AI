// Definition of the VoltGuard Color Palette
// Includes Semantic colors for Battery States and UI elements

export const palette = {
  // Brand Colors
  primary: '#6366f1', // Indigo 500
  primaryDark: '#4338ca', // Indigo 700
  accent: '#a855f7', // Purple 500
  
  // Functional Colors
  success: '#10b981', // Emerald 500 (Battery Good)
  warning: '#f59e0b', // Amber 500 (Battery Medium)
  danger: '#ef4444', // Red 500 (Battery Low/Critical)
  charging: '#22c55e', // Green 500 (Charging State)
  
  // Neutrals (Light)
  white: '#ffffff',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate800: '#1e293b',
  slate900: '#0f172a',
  black: '#000000',
};

export const theme = {
  light: {
    background: palette.slate50,
    card: palette.white,
    text: palette.slate900,
    textSecondary: palette.slate600,
    border: palette.slate200,
    primary: palette.primary,
    tint: palette.primary,
    tabBar: palette.white,
    tabBarActive: palette.primary,
    tabBarInactive: palette.slate400,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    charging: palette.charging,
    gradientStart: palette.primary,
    gradientEnd: palette.accent,
  },
  dark: {
    background: palette.slate900,
    card: palette.slate800,
    text: palette.slate50,
    textSecondary: palette.slate400,
    border: palette.slate600,
    primary: palette.primary,
    tint: palette.white,
    tabBar: palette.slate800,
    tabBarActive: palette.accent,
    tabBarInactive: palette.slate600,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    charging: palette.charging,
    gradientStart: palette.primaryDark,
    gradientEnd: palette.accent,
  },
};