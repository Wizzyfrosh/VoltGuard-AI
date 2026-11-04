import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type VoltGuardBatteryNativeModule = {
  getBatteryDiagnostics: () => Record<string, unknown> | null;
  startBackgroundMonitoring: (threshold: number) => Promise<void>;
  stopBackgroundMonitoring: () => Promise<void>;
};

let nativeModule: VoltGuardBatteryNativeModule | null = null;
function getNativeModule(): VoltGuardBatteryNativeModule | null {
  if (Platform.OS !== 'android') return null;
  if (!nativeModule) nativeModule = requireNativeModule<VoltGuardBatteryNativeModule>('VoltGuardBattery');
  return nativeModule;
}

export async function startBackgroundBatteryMonitoring(threshold: number): Promise<boolean> {
  if (Platform.OS !== 'android' || !Number.isInteger(threshold) || threshold < 50 || threshold > 100) return false;
  const module = getNativeModule();
  if (!module) return false;
  await module.startBackgroundMonitoring(threshold);
  return true;
}

export async function stopBackgroundBatteryMonitoring(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = getNativeModule();
  if (!module) return false;
  await module.stopBackgroundMonitoring();
  return true;
}
