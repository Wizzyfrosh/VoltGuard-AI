export type ChargingHubState = {
  label: 'Charging' | 'Fully charged' | 'Not charging' | 'Status unavailable';
  connected: boolean;
  activelyCharging: boolean;
  fullyCharged: boolean;
};

export type PlatformBatteryState = 'charging' | 'full' | 'unplugged' | 'unknown';
export type NativeChargingStatus = 'charging' | 'discharging' | 'full' | 'unknown' | null;

export function resolveChargingHubState(
  batteryState: PlatformBatteryState,
  nativeStatus: NativeChargingStatus,
  nativePlugged: boolean | null,
): ChargingHubState {
  // Prefer an explicit native reading when available; it is sourced from
  // Android's battery intent and prevents stale cross-platform state winning.
  const effectiveState: PlatformBatteryState =
    nativeStatus === 'charging' ? 'charging'
      : nativeStatus === 'full' ? 'full'
        : nativeStatus === 'discharging' ? 'unplugged'
          : batteryState;

  const activelyCharging = effectiveState === 'charging';
  const fullyCharged = effectiveState === 'full';
  const connected = activelyCharging || (fullyCharged && nativePlugged === true);
  const label = activelyCharging ? 'Charging'
    : fullyCharged ? 'Fully charged'
      : effectiveState === 'unplugged' ? 'Not charging'
        : 'Status unavailable';

  return { label, connected, activelyCharging, fullyCharged };
}
