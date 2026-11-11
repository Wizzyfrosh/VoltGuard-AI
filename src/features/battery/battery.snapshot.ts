import type { BatterySnapshot } from './battery.types';

const AVAILABLE = 'available' as const;

/**
 * Merge a partial platform event into the latest snapshot without making
 * unchanged hardware diagnostics appear freshly sampled.
 */
export function mergeBatterySnapshots(
  current: BatterySnapshot,
  incoming: BatterySnapshot,
  unknownState: BatterySnapshot['state'],
): BatterySnapshot {
  const level = incoming.level ?? current.level;
  const state = incoming.state !== unknownState ? incoming.state : current.state;
  const lowPowerMode = incoming.lowPowerMode ?? current.lowPowerMode;
  const hasNewDiagnostics = incoming.androidDiagnostics !== null;
  const androidDiagnostics = incoming.androidDiagnostics ?? current.androidDiagnostics;
  const diagnosticsObservedAt = hasNewDiagnostics
    ? incoming.diagnosticsObservedAt ?? incoming.observedAt
    : current.diagnosticsObservedAt ?? null;

  const capabilities = {
    ...incoming.capabilities,
    batteryLevel: level !== null ? AVAILABLE : incoming.capabilities.batteryLevel,
    chargingState: state !== unknownState ? AVAILABLE : incoming.capabilities.chargingState,
    lowPowerMode: lowPowerMode !== null ? AVAILABLE : incoming.capabilities.lowPowerMode,
    temperature: androidDiagnostics?.temperatureCelsius != null ? AVAILABLE : incoming.capabilities.temperature,
    voltage: androidDiagnostics?.voltageMilliVolts != null ? AVAILABLE : incoming.capabilities.voltage,
    batteryHealth: androidDiagnostics?.health ? AVAILABLE : incoming.capabilities.batteryHealth,
    batteryTechnology: androidDiagnostics?.technology ? AVAILABLE : incoming.capabilities.batteryTechnology,
    batteryCurrent: androidDiagnostics?.currentNowMicroAmps != null ||
      androidDiagnostics?.currentAverageMicroAmps != null
      ? AVAILABLE : incoming.capabilities.batteryCurrent,
    remainingCharge: androidDiagnostics?.chargeCounterMicroAmpHours != null
      ? AVAILABLE : incoming.capabilities.remainingCharge,
    energyCounter: androidDiagnostics?.energyCounterNanoWattHours != null
      ? AVAILABLE : incoming.capabilities.energyCounter,
  };

  const hasUsableTelemetry = level !== null || state !== unknownState || lowPowerMode !== null;
  const source = androidDiagnostics !== null
    ? 'native'
    : hasUsableTelemetry
      ? (incoming.source === 'unavailable' ? current.source : incoming.source)
      : 'unavailable';

  return {
    ...incoming,
    level,
    state,
    lowPowerMode,
    androidDiagnostics,
    diagnosticsObservedAt,
    capabilities,
    source,
  };
}
