/**
 * Normalize Expo's battery-level fraction to a valid 0..1 value.
 * Unsupported values such as -1, NaN and out-of-range numbers become null.
 */
export function normalizeBatteryLevel(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 1) return null;
  return value;
}

export function isKnownBatteryState<T>(state: T, unknownState: T): boolean {
  return state !== unknownState;
}
