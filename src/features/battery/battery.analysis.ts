export interface BatteryDrainSample {
  observedAt: string;
  level: number | null;
  isUnplugged: boolean;
}

export interface BatteryDrainAnalysis {
  status: 'insufficient-data' | 'stable' | 'elevated' | 'rapid';
  drainPercentPerHour: number | null;
  elapsedMinutes: number | null;
  coverage: 'low' | 'moderate' | 'good';
  sampleCount: number;
  explanation: string;
}

const MIN_INTERVAL_MS = 5 * 60_000;
const MAX_INTERVAL_MS = 6 * 60 * 60_000;

export function analyzeBatteryDrain(samples: BatteryDrainSample[]): BatteryDrainAnalysis {
  const valid = samples
    .map((sample) => ({ ...sample, timestamp: Date.parse(sample.observedAt) }))
    .filter((sample) => Number.isFinite(sample.timestamp) &&
      sample.level !== null && Number.isFinite(sample.level) &&
      sample.level >= 0 && sample.level <= 1)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (valid.length < 2) {
    return { status: 'insufficient-data', drainPercentPerHour: null, elapsedMinutes: null,
      coverage: 'low', sampleCount: valid.length,
      explanation: 'Collect more battery history while unplugged to estimate discharge rate.' };
  }

  // Sliding window over contiguous unplugged samples. This is O(n), even
  // when history contains dense readings, and never bridges a charging sample.
  let best: { start: typeof valid[number]; end: typeof valid[number] } | null = null;
  let segmentStart = 0;
  let windowStart = 0;
  for (let endIndex = 0; endIndex < valid.length; endIndex += 1) {
    if (!valid[endIndex].isUnplugged) {
      segmentStart = endIndex + 1;
      windowStart = endIndex + 1;
      continue;
    }

    windowStart = Math.max(windowStart, segmentStart);
    while (
      windowStart < endIndex &&
      valid[endIndex].timestamp - valid[windowStart].timestamp > MAX_INTERVAL_MS
    ) {
      windowStart += 1;
    }

    const elapsed = valid[endIndex].timestamp - valid[windowStart].timestamp;
    if (elapsed >= MIN_INTERVAL_MS &&
        (!best || elapsed > best.end.timestamp - best.start.timestamp)) {
      best = { start: valid[windowStart], end: valid[endIndex] };
    }
  }

  if (!best) {
    return { status: 'insufficient-data', drainPercentPerHour: null, elapsedMinutes: null,
      coverage: 'low', sampleCount: valid.length,
      explanation: 'No reliable unplugged observation window is available yet.' };
  }

  const elapsedMs = best.end.timestamp - best.start.timestamp;
  const elapsedMinutes = elapsedMs / 60_000;
  const drop = (best.start.level as number) - (best.end.level as number);
  if (drop <= 0) {
    return { status: 'stable', drainPercentPerHour: 0, elapsedMinutes,
      coverage: valid.length >= 6 ? 'good' : 'moderate', sampleCount: valid.length,
      explanation: 'No measurable battery percentage drop occurred during this observation window.' };
  }

  const rate = (drop * 100) / (elapsedMs / 3_600_000);
  const windowSampleCount = valid.filter((sample) =>
    sample.timestamp >= best!.start.timestamp && sample.timestamp <= best!.end.timestamp,
  ).length;
  const coverage = windowSampleCount >= 12 ? 'good' : windowSampleCount >= 5 ? 'moderate' : 'low';
  const status = rate >= 15 ? 'rapid' : rate >= 8 ? 'elevated' : 'stable';
  const explanation = status === 'rapid'
    ? 'Discharge is unusually fast in this sample window. Screen use, weak signal, high temperature or background activity may contribute; this data cannot identify a specific app.'
    : status === 'elevated'
      ? 'Discharge is above the normal review threshold in this sample window. Check screen use, signal conditions and battery temperature.'
      : 'Discharge is within the current review threshold for this sample window.';
  return { status, drainPercentPerHour: Math.round(rate * 10) / 10, elapsedMinutes,
    coverage, sampleCount: valid.length, explanation };
}

export type BatteryHealthExplanation = {
  osStatus: string | null;
  condition: 'reported-good' | 'reported-warning' | 'reported-critical' | 'unknown';
  message: string;
  estimatedWearPercent: null;
};

export function explainBatteryHealth(osHealth: string | null): BatteryHealthExplanation {
  const normalized = osHealth?.trim().toLowerCase().replace(/[_\s]+/g, '-') ?? '';
  const condition = normalized === 'good'
    ? 'reported-good'
    : ['overheat', 'over-voltage', 'failure', 'cold'].includes(normalized)
      ? 'reported-warning'
      : normalized === 'dead' || normalized === 'unspecified-failure'
        ? 'reported-critical'
        : 'unknown';
  const message = condition === 'reported-good'
    ? 'Android reports the battery health status as good. This is not a measured battery-capacity or wear percentage.'
    : condition === 'reported-warning'
      ? 'Android reports a battery health warning. Review temperature and device guidance; this is an OS status, not a capacity estimate.'
      : condition === 'reported-critical'
        ? 'Android reports a critical battery health status. Consider professional device service.'
        : 'Android has not provided a usable health status. VoltGuard cannot calculate battery wear without reliable design and full-charge capacity readings.';
  return { osStatus: osHealth, condition, message, estimatedWearPercent: null };
}
