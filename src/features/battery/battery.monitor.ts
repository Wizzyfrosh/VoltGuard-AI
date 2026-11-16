import type { BatteryState } from 'expo-battery';

export interface BatteryMonitorSample {
  observedAt: string;
  level: number | null;
  state: BatteryState;
}

export interface BatteryDiagnosticSample {
  observedAt: string;
  apiLevel: number | null;
  voltageMilliVolts: number | null;
  temperatureCelsius: number | null;
  health: string | null;
  chargingSource: string | null;
  currentNowMilliAmps: number | null;
  currentAverageMilliAmps: number | null;
  remainingChargeMilliAmpHours: number | null;
  energyCounterMilliWattHours: number | null;
  cycleCount: number | null;
  technology: string | null;
}

export interface MetricRange {
  minimum: number | null;
  maximum: number | null;
  sampleCount: number;
}

export interface BatteryMonitorReport {
  sampleCount: number;
  observedDays: number;
  temperature: MetricRange;
  voltage: MetricRange;
  current: MetricRange;
  estimate: {
    direction: 'charging' | 'discharging' | 'unavailable';
    minutesRemaining: number | null;
    percentPerHour: number | null;
    sampleCount: number;
    elapsedMinutes: number | null;
    confidence: 'low' | 'moderate' | 'good';
    explanation: string;
  };
}

const MIN_INTERVAL_MS = 5 * 60_000;
const MAX_INTERVAL_MS = 2 * 60 * 60_000;
const MIN_WINDOW_MS = 15 * 60_000;
const STATE_CHARGING = 2;
const STATE_FULL = 3;
const STATE_UNPLUGGED = 1;

function metricRange(values: Array<number | null>, min: number, max: number): MetricRange {
  const valid = values.filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max,
  );
  return {
    minimum: valid.length ? Math.min(...valid) : null,
    maximum: valid.length ? Math.max(...valid) : null,
    sampleCount: valid.length,
  };
}

/** Estimates time-to-empty/full from a contiguous, recent, same-state sample window.
 * It uses linear regression rather than a single noisy percentage interval. */
export function estimateBatteryTime(
  samples: BatteryMonitorSample[],
  now = Date.now(),
) {
  const valid = samples
    .map((sample) => ({ ...sample, timestamp: Date.parse(sample.observedAt) }))
    .filter((sample) =>
      Number.isFinite(sample.timestamp) &&
      sample.timestamp <= now &&
      now - sample.timestamp <= 24 * 60 * 60_000 &&
      typeof sample.level === 'number' &&
      Number.isFinite(sample.level) &&
      sample.level >= 0 && sample.level <= 1,
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  if (valid.length < 4) return unavailableEstimate();

  const latest = valid[valid.length - 1];
  const direction = latest.state === STATE_UNPLUGGED
    ? 'discharging'
    : latest.state === STATE_CHARGING ? 'charging' : 'unavailable';
  if (direction === 'unavailable') return unavailableEstimate();

  const segment = [latest];
  for (let index = valid.length - 2; index >= 0 && segment.length < 12; index -= 1) {
    const candidate = valid[index];
    const next = segment[0];
    const gap = next.timestamp - candidate.timestamp;
    if (candidate.state !== latest.state || gap < MIN_INTERVAL_MS || gap > MAX_INTERVAL_MS) break;
    segment.unshift(candidate);
  }
  const elapsed = segment[segment.length - 1].timestamp - segment[0].timestamp;
  if (segment.length < 4 || elapsed < MIN_WINDOW_MS) return unavailableEstimate(direction, segment.length);

  const origin = segment[0].timestamp;
  const xs = segment.map((item) => (item.timestamp - origin) / 3_600_000);
  const ys = segment.map((item) => (item.level as number) * 100);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (denominator <= 0) return unavailableEstimate(direction, segment.length);
  const slope = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / denominator;
  const expectedSign = direction === 'discharging' ? slope < -0.1 : slope > 0.1;
  if (!Number.isFinite(slope) || !expectedSign) return unavailableEstimate(direction, segment.length);

  const currentPercent = (latest.level as number) * 100;
  const remainingPercent = direction === 'discharging' ? currentPercent : 100 - currentPercent;
  const minutesRemaining = Math.round((remainingPercent / Math.abs(slope)) * 60);
  const confidence = segment.length >= 8 && elapsed >= 60 * 60_000
    ? 'good'
    : segment.length >= 5 && elapsed >= 30 * 60_000 ? 'moderate' : 'low';
  return {
    direction,
    minutesRemaining: Number.isFinite(minutesRemaining) && minutesRemaining >= 0 ? minutesRemaining : null,
    percentPerHour: Math.round(Math.abs(slope) * 10) / 10,
    sampleCount: segment.length,
    elapsedMinutes: Math.round(elapsed / 60_000),
    confidence,
    explanation: 'Estimate uses a linear fit of recent saved battery percentages while the device remained in the same charging state. Screen use, temperature, signal conditions and battery reporting can change the result.',
  };
}

function unavailableEstimate(
  direction: 'charging' | 'discharging' | 'unavailable' = 'unavailable',
  sampleCount = 0,
) {
  return {
    direction,
    minutesRemaining: null,
    percentPerHour: null,
    sampleCount,
    elapsedMinutes: null,
    confidence: 'low' as const,
    explanation: 'More recent, consistent battery history is required before VoltGuard can estimate remaining time.',
  };
}

export function buildBatteryMonitorReport(
  samples: BatteryMonitorSample[],
  diagnostics: BatteryDiagnosticSample[],
  now = Date.now(),
): BatteryMonitorReport {
  const cutoff = now - 30 * 24 * 60 * 60_000;
  const validSamples = samples.filter((sample) => {
    const timestamp = Date.parse(sample.observedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now;
  });
  const observedDays = new Set(validSamples.map((sample) => {
    const date = new Date(sample.observedAt);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  })).size;
  const validDiagnostics = diagnostics
    .filter((item) => {
      const timestamp = Date.parse(item.observedAt);
      return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now;
    })
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  return {
    sampleCount: validSamples.length,
    observedDays,
    temperature: metricRange(validDiagnostics.map((item) => item.temperatureCelsius), -50, 150),
    voltage: metricRange(validDiagnostics.map((item) => item.voltageMilliVolts), 1, 100_000),
    current: metricRange(validDiagnostics.map((item) => item.currentNowMilliAmps), -100_000, 100_000),
    estimate: estimateBatteryTime(validSamples, now),
  };
}
