import type { BatteryState } from 'expo-battery';
import type { AndroidBatteryDiagnostics } from './battery.android.normalization';

export type BatteryPlatform = 'android' | 'ios' | 'web' | 'unknown';
export type TelemetrySource = 'expo-battery' | 'native' | 'unavailable';

export type BatteryCapability =
  | 'batteryLevel'
  | 'chargingState'
  | 'lowPowerMode'
  | 'temperature'
  | 'voltage'
  | 'batteryHealth'
  | 'cycleCount'
  | 'perAppPowerUsage'
  | 'batteryTechnology'
  | 'batteryCurrent'
  | 'remainingCharge'
  | 'energyCounter';

export type CapabilityAvailability = 'available' | 'unavailable' | 'not-implemented';

export interface BatteryCapabilities {
  batteryLevel: CapabilityAvailability;
  chargingState: CapabilityAvailability;
  lowPowerMode: CapabilityAvailability;
  temperature: CapabilityAvailability;
  voltage: CapabilityAvailability;
  batteryHealth: CapabilityAvailability;
  cycleCount: CapabilityAvailability;
  perAppPowerUsage: CapabilityAvailability;
  batteryTechnology: CapabilityAvailability;
  batteryCurrent: CapabilityAvailability;
  remainingCharge: CapabilityAvailability;
  energyCounter: CapabilityAvailability;
}

export interface BatterySnapshot {
  platform: BatteryPlatform;
  level: number | null;
  state: BatteryState;
  lowPowerMode: boolean | null;
  observedAt: string;
  source: TelemetrySource;
  capabilities: BatteryCapabilities;
  androidDiagnostics: AndroidBatteryDiagnostics | null;
}

export type BatterySnapshotListener = (snapshot: BatterySnapshot) => void;

export interface BatteryTelemetryProvider {
  getSnapshot(): Promise<BatterySnapshot>;
  subscribe(listener: BatterySnapshotListener): () => void;
}
