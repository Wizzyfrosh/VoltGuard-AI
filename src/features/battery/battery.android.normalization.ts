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
  technology?: string | null;
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
  technology: string | null;
  currentNowMilliAmps: number | null;
  currentAverageMilliAmps: number | null;
  remainingChargeMilliAmpHours: number | null;
  energyCounterMilliWattHours: number | null;
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

function nonNegativeIntegerOrNull(value: unknown): number | null {
  const number = finiteOrNull(value);
  return number !== null && Number.isInteger(number) && number >= 0 ? number : null;
}

// Round magnitudes symmetrically so -325.5 mA becomes -326 mA, not -325 mA.
function microAmpsToRoundedMilliAmps(value: unknown): number | null {
  const microAmps = finiteOrNull(value);
  if (microAmps === null) return null;
  return Math.sign(microAmps) * Math.round(Math.abs(microAmps) / 1000);
}

export function normalizeAndroidBatteryDiagnostics(
  raw: AndroidBatteryDiagnosticsRaw | null | undefined,
): AndroidBatteryDiagnostics | null {
  if (!raw || typeof raw !== 'object') return null;

  const temperatureTenths = finiteOrNull(raw.temperatureTenthsCelsius);
  const capacity = finiteOrNull(raw.capacityPercent);

  return {
    apiLevel: nonNegativeIntegerOrNull(raw.apiLevel),
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
    cycleCount: nonNegativeIntegerOrNull(raw.cycleCount),
    technology: typeof raw.technology === 'string' && raw.technology.trim().length > 0 ? raw.technology.trim() : null,
    currentNowMilliAmps: microAmpsToRoundedMilliAmps(raw.currentNowMicroAmps),
    currentAverageMilliAmps: microAmpsToRoundedMilliAmps(raw.currentAverageMicroAmps),
    remainingChargeMilliAmpHours: nonNegativeOrNull(raw.chargeCounterMicroAmpHours) === null ? null : Math.round((raw.chargeCounterMicroAmpHours as number) / 1000),
    energyCounterMilliWattHours: nonNegativeOrNull(raw.energyCounterNanoWattHours) === null ? null : Math.round((raw.energyCounterNanoWattHours as number) / 1000000),
  };
}
