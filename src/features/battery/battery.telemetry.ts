import type { BatterySnapshot } from './battery.types';

export function mergeBatterySnapshots(
  current: BatterySnapshot,
  incoming: BatterySnapshot,
  preserveCurrentTelemetry = false,
  preserveDiagnostics = true,
): BatterySnapshot {
  const useCurrent = (preserveCurrentTelemetry ? current : incoming);
  const diagnostics = preserveDiagnostics
    ? incoming.androidDiagnostics ?? current.androidDiagnostics
    : incoming.androidDiagnostics;
  const diagnosticsObservedAt = incoming.androidDiagnostics
    ? incoming.diagnosticsObservedAt ?? incoming.observedAt
    : preserveDiagnostics ? current.diagnosticsObservedAt ?? null : null;
  const level = useCurrent.level ?? (preserveCurrentTelemetry ? incoming.level : current.level);
  const state = useCurrent.state !== 0 /* BatteryState.UNKNOWN */
    ? useCurrent.state
    : (preserveCurrentTelemetry ? incoming.state : current.state);
  const lowPowerMode = useCurrent.lowPowerMode ?? (preserveCurrentTelemetry ? incoming.lowPowerMode : current.lowPowerMode);
  const capabilities = {
    ...incoming.capabilities,
    batteryLevel: level !== null ? 'available' as const : incoming.capabilities.batteryLevel,
    chargingState: state !== ExpoBattery.BatteryState.UNKNOWN ? 'available' as const : incoming.capabilities.chargingState,
    lowPowerMode: lowPowerMode !== null ? 'available' as const : incoming.capabilities.lowPowerMode,
    temperature: diagnostics?.temperatureCelsius != null ? 'available' as const : incoming.capabilities.temperature,
    voltage: diagnostics?.voltageMilliVolts != null ? 'available' as const : incoming.capabilities.voltage,
    batteryHealth: diagnostics?.health ? 'available' as const : incoming.capabilities.batteryHealth,
    batteryTechnology: diagnostics?.technology ? 'available' as const : incoming.capabilities.batteryTechnology,
    batteryCurrent: diagnostics?.currentNowMicroAmps != null || diagnostics?.currentAverageMicroAmps != null
      ? 'available' as const : incoming.capabilities.batteryCurrent,
    remainingCharge: diagnostics?.chargeCounterMicroAmpHours != null
      ? 'available' as const : incoming.capabilities.remainingCharge,
    energyCounter: diagnostics?.energyCounterNanoWattHours != null
      ? 'available' as const : incoming.capabilities.energyCounter,
  };

  return {
    ...incoming,
    level,
    state,
    lowPowerMode,
    observedAt: preserveCurrentTelemetry && current.observedAt ? current.observedAt : incoming.observedAt,
    diagnosticsObservedAt,
    androidDiagnostics: diagnostics,
    capabilities,
    source: diagnostics ? 'native' : useCurrent.source !== 'unavailable' ? useCurrent.source : incoming.source,
  };
}

export function shouldPersistBatterySnapshot(
  previous: BatterySnapshot | null,
  next: BatterySnapshot,
  minimumIntervalMs = 5 * 60 * 1000,
): boolean {
  if (next.source === 'unavailable') return false;
  if (!previous) return true;
  if (previous.state !== next.state || previous.lowPowerMode !== next.lowPowerMode) return true;
  if (previous.source !== next.source) return true;
  if (previous.level !== null && next.level !== null && Math.abs(previous.level - next.level) >= 0.01) return true;
  const previousTime = Date.parse(previous.observedAt);
  const nextTime = Date.parse(next.observedAt);
  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime)) return true;
  return nextTime - previousTime >= minimumIntervalMs;
}
