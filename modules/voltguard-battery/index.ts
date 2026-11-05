import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type VoltGuardBatteryNativeModule = {
  getBatteryDiagnostics: () => Record<string, unknown> | null;
  getOptimizationDiagnostics: () => OptimizationDiagnostics | null;
  openOptimizationSetting: (setting: string) => boolean;
  startBackgroundMonitoring: (threshold: number) => Promise<void>;
  stopBackgroundMonitoring: () => Promise<void>;
  getChargingAlarmStatus: () => ChargingAlarmStatus;
  sendTestChargingAlarm: () => boolean;
};

export type ChargingAlarmStatus = {
  channelId: string;
  notificationsEnabled: boolean;
  channelEnabled: boolean;
  highImportance: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alarmReady: boolean;
};

let nativeModule: VoltGuardBatteryNativeModule | null = null;
function getNativeModule(): VoltGuardBatteryNativeModule | null {
  if (Platform.OS !== 'android') return null;
  if (!nativeModule) nativeModule = requireNativeModule<VoltGuardBatteryNativeModule>('VoltGuardBattery');
  return nativeModule;
}


export type OptimizationDiagnostics = {
  locationEnabled: boolean | null;
  automaticBrightnessEnabled: boolean | null;
  bluetoothEnabled: boolean | null;
  nfcEnabled: boolean | null;
  masterSyncEnabled: boolean | null;
};

export function getOptimizationDiagnostics(): OptimizationDiagnostics | null {
  if (Platform.OS !== 'android') return null;
  return getNativeModule()?.getOptimizationDiagnostics() ?? null;
}

export function openOptimizationSetting(setting: 'brightness' | 'location' | 'bluetooth' | 'nfc' | 'sync'): boolean {
  if (Platform.OS !== 'android') return false;
  return getNativeModule()?.openOptimizationSetting(setting) ?? false;
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

export function getChargingAlarmStatus(): ChargingAlarmStatus | null {
  if (Platform.OS !== 'android') return null;
  return getNativeModule()?.getChargingAlarmStatus() ?? null;
}

export async function sendTestChargingAlarm(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = getNativeModule();
  if (!module) return false;
  return module.sendTestChargingAlarm();
}
