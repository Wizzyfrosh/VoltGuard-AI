export async function startBackgroundBatteryMonitoring(_threshold: number): Promise<boolean> { return false; }
export async function stopBackgroundBatteryMonitoring(): Promise<boolean> { return false; }

export type ChargingAlarmStatus = {
  channelId: string;
  notificationsEnabled: boolean;
  channelEnabled: boolean;
  highImportance: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alarmReady: boolean;
};

export type OptimizationDiagnostics = {
  locationEnabled: boolean | null;
  automaticBrightnessEnabled: boolean | null;
  bluetoothEnabled: boolean | null;
  nfcEnabled: boolean | null;
  masterSyncEnabled: boolean | null;
};

// These diagnostics are Android-only. Null means the platform does not expose them.
export function getOptimizationDiagnostics(): OptimizationDiagnostics | null { return null; }

// Web cannot open Android system settings.
export function openOptimizationSetting(_setting: 'brightness' | 'location' | 'bluetooth' | 'nfc' | 'sync'): boolean { return false; }

export function getChargingAlarmStatus(): ChargingAlarmStatus | null { return null; }
export async function sendTestChargingAlarm(): Promise<boolean> { return false; }

export type AppUsageEntry = {
  packageName: string;
  appLabel: string;
  foregroundTimeMs: number;
  lastTimeUsed: number;
};

export type AppUsageSnapshot = {
  permissionGranted: boolean;
  windowStart: number;
  windowEnd: number;
  apps: AppUsageEntry[];
};

// Android Usage Access is not available to web builds.
export function hasUsageAccess(): boolean { return false; }
export function openUsageAccessSettings(): boolean { return false; }
export function getAppUsageStats(): AppUsageSnapshot | null { return null; }
