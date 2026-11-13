import { requireNativeModule } from 'expo-modules-core';
import { Platform, PermissionsAndroid } from 'react-native';

type VoltGuardBatteryNativeModule = {
  getBatteryDiagnostics: () => Record<string, unknown> | null;
  getOptimizationDiagnostics: () => OptimizationDiagnostics | null;
  openOptimizationSetting: (setting: string) => boolean;
  startBackgroundMonitoring: (threshold: number) => Promise<void>;
  stopBackgroundMonitoring: () => Promise<void>;
  hasAntiTheftPin: () => boolean;
  setAntiTheftPin: (pin: string) => Promise<boolean>;
  armAntiTheft: (mode: AntiTheftMode) => boolean;
  disarmAntiTheft: (pin: string) => Promise<boolean>;
  getAntiTheftStatus: () => AntiTheftStatus;
  setAntiTheftDelay: (seconds: number) => boolean;
  setAntiTheftVibration: (enabled: boolean) => boolean;
  setAntiTheftFlash: (enabled: boolean) => boolean;
  getChargingAlarmStatus: () => ChargingAlarmStatus;
  sendTestChargingAlarm: () => boolean;
  hasUsageAccess: () => Promise<boolean>;
  openUsageAccessSettings: () => boolean;
  getAppUsageStats: () => Promise<AppUsageSnapshot | null>;
  getSystemResourceDiagnostics: () => Promise<SystemResourceDiagnostics | null>;
};

export type AntiTheftMode = 'one_time' | 'always';
export type AntiTheftStatus = {
  pinConfigured: boolean;
  armed: boolean;
  alarmActive: boolean;
  restoreFailed: boolean;
  mode: AntiTheftMode;
  delaySeconds: number;
  vibrationEnabled: boolean;
  vibrationAvailable: boolean;
  flashEnabled: boolean;
  flashAvailable: boolean;
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


export type SystemResourceDiagnostics = {
  totalRamBytes: number | null;
  availableRamBytes: number | null;
  lowMemory: boolean | null;
  totalStorageBytes: number | null;
  availableStorageBytes: number | null;
};

export async function setAntiTheftFlash(enabled: boolean): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (enabled) {
    const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Camera permission is required to use the Anti-Theft flash.");
    }
  }
  return getNativeModule()?.setAntiTheftFlash(enabled) ?? false;
}

export function setAntiTheftVibration(enabled: boolean): boolean {
  if (Platform.OS !== 'android') return false;
  return getNativeModule()?.setAntiTheftVibration(enabled) ?? false;
}

export function setAntiTheftDelay(seconds: number): boolean {
  if (Platform.OS !== 'android') return false;
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 30) {
    throw new Error('Disconnect delay must be between 0 and 30 seconds.');
  }
  return getNativeModule()?.setAntiTheftDelay(seconds) ?? false;
}

export function getAntiTheftStatus(): AntiTheftStatus | null {
  if (Platform.OS !== 'android') return null;
  return getNativeModule()?.getAntiTheftStatus() ?? null;
}

export async function setAntiTheftPin(pin: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!/^\d{6,12}$/.test(pin)) throw new Error('PIN must contain 6 to 12 digits.');
  const module = getNativeModule();
  if (!module) return false;
  return await module.setAntiTheftPin(pin);
}

export function armAntiTheft(mode: AntiTheftMode): boolean {
  if (Platform.OS !== 'android') return false;
  return getNativeModule()?.armAntiTheft(mode) ?? false;
}

export async function disarmAntiTheft(pin: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = getNativeModule();
  if (!module) return false;
  return await module.disarmAntiTheft(pin);
}

export async function getSystemResourceDiagnostics(): Promise<SystemResourceDiagnostics | null> {
  if (Platform.OS !== 'android') return null;
  return (await getNativeModule()?.getSystemResourceDiagnostics()) ?? null;
}

export type AppUsageEntry = {
  packageName: string;
  appLabel: string;
  iconDataUri: string | null;
  foregroundTimeMs: number;
  lastTimeUsed: number;
};

export type AppUsageSnapshot = {
  permissionGranted: boolean;
  queryAvailable?: boolean;
  windowStart: number;
  windowEnd: number;
  apps: AppUsageEntry[];
};

export async function hasUsageAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return (await getNativeModule()?.hasUsageAccess()) ?? false;
}

export function openUsageAccessSettings(): boolean {
  if (Platform.OS !== 'android') return false;
  return getNativeModule()?.openUsageAccessSettings() ?? false;
}

export async function getAppUsageStats(): Promise<AppUsageSnapshot | null> {
  if (Platform.OS !== 'android') return null;
  return (await getNativeModule()?.getAppUsageStats()) ?? null;
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
