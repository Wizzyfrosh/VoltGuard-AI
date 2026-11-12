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
  // Charcoal surfaces follow the compact device-monitor reference without
  // turning the whole interface into a saturated navy dashboard.
  dark: {
    background: '#202124', card: '#2B2D31', text: '#F2F3F5', textSecondary: '#B0B3B8',
    border: '#3B3D42', primary: '#58A65C', tint: '#FFFFFF', tabBar: '#292B30',
    tabBarActive: '#68B96D', tabBarInactive: '#A0A3A8', success: '#68B96D',
    warning: '#F5B942', danger: '#F05252', charging: '#68B96D',
    gradientStart: '#3487FF', gradientEnd: '#68B96D',
  },
};
