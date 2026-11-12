import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import {
  normalizeAndroidBatteryDiagnostics,
  type AndroidBatteryDiagnostics,
  type AndroidBatteryDiagnosticsRaw,
} from './battery.android.normalization';

interface VoltGuardBatteryNativeModule {
  getBatteryDiagnostics(): Promise<AndroidBatteryDiagnosticsRaw | null> | AndroidBatteryDiagnosticsRaw | null;
}

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<VoltGuardBatteryNativeModule>('VoltGuardBattery')
  : null;

export async function getAndroidBatteryDiagnostics(): Promise<AndroidBatteryDiagnostics | null> {
  if (Platform.OS !== 'android' || !nativeModule) return null;

  try {
    const raw = await nativeModule.getBatteryDiagnostics();
    return normalizeAndroidBatteryDiagnostics(raw);
  } catch {
    // Native diagnostics are optional. Expo Battery telemetry must continue working.
    return null;
  }
}
