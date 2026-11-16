import type { BatteryState } from 'expo-battery';

export type ChargingHubState = {
  label: 'Charging' | 'Fully charged' | 'Not charging' | 'Status unavailable';
  connected: boolean;
  activelyCharging: boolean;
  fullyCharged: boolean;
};

export function resolveChargingHubState(
  batteryState: BatteryState,
  nativeStatus: 'charging' | 'discharging' | 'full' | 'unknown' | null,
  nativePlugged: boolean | null,
): ChargingHubState {
  const activelyCharging = batteryState === 2 || nativeStatus === 'charging';
  const fullyCharged = batteryState === 3 || nativeStatus === 'full';
  const connected = activelyCharging || (nativeStatus === 'full' && nativePlugged === true);
  const label = activelyCharging
    ? 'Charging'
    : fullyCharged
      ? 'Fully charged'
      : batteryState === 1 || nativeStatus === 'discharging'
        ? 'Not charging'
        : 'Status unavailable';

  return { label, connected, activelyCharging, fullyCharged };
}
