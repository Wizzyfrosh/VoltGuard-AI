export interface AndroidBatteryDiagnosticsRaw {
  apiLevel?: number | null;
  voltageMilliVolts?: number | null;
  temperatureTenthsCelsius?: number | null;
  health?: string | null;
  status?: string | null;
  plugged?: string | null;
  capacityPercent?: number | null;
  currentNowMicroAmps?: number | null;
  currentAverageMicroAmps?: number | null;
  chargeCounterMicroAmpHours?: number | null;
  energyCounterNanoWattHours?: number | null;
  cycleCount?: number | null;
}

export interface AndroidBatteryDiagnostics {
  apiLevel: number | null;
  voltageMilliVolts: number | null;
  temperatureCelsius: number | null;
  health: string | null;
  status: string | null;
  plugged: string | null;
  capacityPercent: number | null;
  currentNowMicroAmps: number | null;
  currentAverageMicroAmps: number | null;
  chargeCounterMicroAmpHours: number | null;
  energyCounterNanoWattHours: number | null;
  cycleCount: number | null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function positiveOrNull(value: unknown): number | null {
  const number = finiteOrNull(value);
  return number !== null && number > 0 ? number : null;
}

function nonNegativeOrNull(value: unknown): number | null {
  const number = finiteOrNull(value);
  return number !== null && number >= 0 ? number : null;
}

export function normalizeAndroidBatteryDiagnostics(
  raw: AndroidBatteryDiagnosticsRaw | null | undefined,
): AndroidBatteryDiagnostics | null {
  if (!raw || typeof raw !== 'object') return null;

  const temperatureTenths = finiteOrNull(raw.temperatureTenthsCelsius);
  const capacity = finiteOrNull(raw.capacityPercent);

  return {
    apiLevel: nonNegativeOrNull(raw.apiLevel),
    voltageMilliVolts: positiveOrNull(raw.voltageMilliVolts),
    temperatureCelsius: temperatureTenths !== null && temperatureTenths >= -500 && temperatureTenths <= 1500
      ? temperatureTenths / 10
      : null,
    health: typeof raw.health === 'string' && raw.health.length > 0 ? raw.health : null,
    status: typeof raw.status === 'string' && raw.status.length > 0 ? raw.status : null,
    plugged: typeof raw.plugged === 'string' && raw.plugged.length > 0 ? raw.plugged : null,
    capacityPercent: capacity !== null && capacity >= 0 && capacity <= 100 ? capacity : null,
    currentNowMicroAmps: finiteOrNull(raw.currentNowMicroAmps),
    currentAverageMicroAmps: finiteOrNull(raw.currentAverageMicroAmps),
    chargeCounterMicroAmpHours: nonNegativeOrNull(raw.chargeCounterMicroAmpHours),
    energyCounterNanoWattHours: nonNegativeOrNull(raw.energyCounterNanoWattHours),
    cycleCount: nonNegativeOrNull(raw.cycleCount),
  };
}
