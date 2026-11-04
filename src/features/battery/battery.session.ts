export type ChargingTransition = 'start' | 'update' | 'finish' | 'none';

export function getChargingTransition(
  isCharging: boolean,
  isUnplugged: boolean,
  hasActiveSession: boolean,
): ChargingTransition {
  if (isCharging && !hasActiveSession) return 'start';
  if (isCharging && hasActiveSession) return 'update';
  if (isUnplugged && hasActiveSession) return 'finish';
  return 'none';
}
