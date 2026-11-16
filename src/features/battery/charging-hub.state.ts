export type ChargingHubState = {
  label: 'Charging' | 'Fully charged' | 'Not charging' | 'Status unavailable';
  connected: boolean;
  activelyCharging: boolean;
  fullyCharged: boolean;
};

// expo-battery's BatteryState numeric enum: UNKNOWN=0, UNPLUGGED=1,
// CHARGING=2, FULL=3.
export type PlatformBatteryState = 0 | 1 | 2 | 3;
export type NativeChargingStatus = 'charging' | 'discharging' | 'full' | 'unknown' | null;

export function resolveChargingHubState(
  batteryState: PlatformBatteryState,
  nativeStatus: NativeChargingStatus,
  nativePlugged: boolean | null,
): ChargingHubState {
  const effectiveState: PlatformBatteryState =
    nativeStatus === 'charging' ? 2
      : nativeStatus === 'full' ? 3
        : nativeStatus === 'discharging' ? 1
          : batteryState;

  const activelyCharging = effectiveState === 2;
  const fullyCharged = effectiveState === 3;
  const connected = activelyCharging || (fullyCharged && nativePlugged === true);
  const label = activelyCharging ? 'Charging'
    : fullyCharged ? 'Fully charged'
      : effectiveState === 1 ? 'Not charging'
        : 'Status unavailable';

  return { label, connected, activelyCharging, fullyCharged };
}
