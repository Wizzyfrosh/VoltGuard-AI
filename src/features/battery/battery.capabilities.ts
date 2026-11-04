import { Platform } from 'react-native';
import type { BatteryCapabilities, BatteryPlatform } from './battery.types';

export function getBatteryPlatform(): BatteryPlatform {
  switch (Platform.OS) {
    case 'android':
    case 'ios':
    case 'web':
      return Platform.OS;
    default:
      return 'unknown';
  }
}

/**
 * Capabilities describe what this application build can actually collect.
 * Do not mark Android-only BatteryManager fields available until a native
 * adapter is installed and has been verified on a physical Android device.
 */
export function getInitialBatteryCapabilities(): BatteryCapabilities {
  return {
    batteryLevel: 'unavailable',
    chargingState: 'unavailable',
    lowPowerMode: 'unavailable',
    temperature: 'not-implemented',
    voltage: 'not-implemented',
    batteryHealth: 'not-implemented',
    cycleCount: 'not-implemented',
    perAppPowerUsage: 'not-implemented',
  };
}
