export const palette = {
  primary: '#2878F0',
  primaryDark: '#1554C7',
  accent: '#F5B91B',
  success: '#10C98A',
  warning: '#F5A623',
  danger: '#F05252',
  charging: '#10C98A',
  white: '#FFFFFF',
  slate50: '#F4F7FC',
  slate100: '#E8EEF8',
  slate200: '#D3DDED',
  slate400: '#8FA3C2',
  slate600: '#536987',
  slate800: '#152746',
  slate900: '#06142F',
  black: '#020817',
};

export const theme = {
  light: {
    background: '#F4F7FC', card: '#FFFFFF', text: '#10213D', textSecondary: '#647894',
    border: '#D6E0EF', primary: palette.primary, tint: palette.primary, tabBar: '#FFFFFF',
    tabBarActive: palette.primary, tabBarInactive: '#8A9AB1', success: palette.success,
    warning: palette.warning, danger: palette.danger, charging: palette.charging,
    gradientStart: '#2878F0', gradientEnd: '#F5B91B',
  },
  dark: {
    background: '#06142F', card: '#102345', text: '#F6F9FF', textSecondary: '#A8B9D3',
    border: '#29446F', primary: '#3487FF', tint: '#FFFFFF', tabBar: '#0C1D3C',
    tabBarActive: '#FFFFFF', tabBarInactive: '#8FA6C9', success: '#10D69A',
    warning: '#F5AD27', danger: '#F05252', charging: '#10D69A',
    gradientStart: '#1675FF', gradientEnd: '#F5B91B',
  },
};
