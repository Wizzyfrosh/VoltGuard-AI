import type { ChargingSession } from './battery.history';

export type BatteryTrendPeriod = 'week' | 'month';
export type TrendCoverage = 'low' | 'moderate' | 'good';

export interface BatteryTrendSample {
  observedAt: string;
  level: number | null;
  batteryState: number;
}

export interface BatteryTrendBucket {
  key: string;
  label: string;
  chargedPercent: number | null;
  dischargedPercent: number | null;
  sampleCount: number;
  observedDays: number;
  coverage: TrendCoverage;
}

export interface BatteryTrendReport {
  period: BatteryTrendPeriod;
  startAt: string;
  endAt: string;
  buckets: BatteryTrendBucket[];
  sampleCount: number;
  coverage: TrendCoverage;
  chargedPercent: number | null;
  dischargedPercent: number | null;
  chargingSessionCount: number;
  completedSessionCount: number;
  averageSessionGainPercent: number | null;
  totalCompletedObservedMinutes: number | null;
  explanation: string;
}

const MAX_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const STATE_UNPLUGGED = 1;
const STATE_CHARGING = 2;
const STATE_FULL = 3;

function localDayStart(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function coverageFor(sampleCount: number, first: number | null, last: number | null): TrendCoverage {
  const span = first === null || last === null ? 0 : last - first;
  if (sampleCount >= 8 && span >= 2 * 60 * 60 * 1000) return 'good';
  if (sampleCount >= 3 && span >= 30 * 60 * 1000) return 'moderate';
  return 'low';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatBucketLabel(start: Date, end: Date, period: BatteryTrendPeriod): string {
  if (period === 'week') {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(start);
  }
  const formatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  return `${formatter.format(start)}–${formatter.format(end)}`;
}

/**
 * Summarizes only observed battery samples. Adjacent samples are compared only
 * when both endpoints report the same charging state and the gap is bounded.
 * No interpolation, sample data, or app-level energy attribution is produced.
 */
export function buildBatteryTrendReport(
  samples: BatteryTrendSample[],
  sessions: ChargingSession[],
  period: BatteryTrendPeriod,
  now = Date.now(),
): BatteryTrendReport {
  const end = localDayStart(new Date(now));
  const dayCount = period === 'week' ? 7 : 30;
  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));
  const windowEndExclusive = new Date(end);
  windowEndExclusive.setDate(windowEndExclusive.getDate() + 1);
  const bucketCount = period === 'week' ? 7 : 5;
  const bucketDays = period === 'week' ? 1 : 7;

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(bucketStart.getDate() + index * bucketDays);
    const bucketEndExclusive = new Date(bucketStart);
    bucketEndExclusive.setDate(bucketEndExclusive.getDate() + bucketDays);
    const bucketEnd = new Date(Math.min(
      windowEndExclusive.getTime() - 1,
      bucketEndExclusive.getTime() - 1,
    ));
    return {
      key: `${period}-${index}-${bucketStart.toISOString().slice(0, 10)}`,
      label: formatBucketLabel(bucketStart, bucketEnd, period),
      startMs: bucketStart.getTime(),
      endMs: bucketEnd.getTime(),
      charged: 0,
      discharged: 0,
      hasCharge: false,
      hasDischarge: false,
      sampleCount: 0,
      firstSampleAt: null as number | null,
      lastSampleAt: null as number | null,
    };
  });

  const valid = samples
    .map((sample) => ({ ...sample, timestamp: Date.parse(sample.observedAt) }))
    .filter((sample) => Number.isFinite(sample.timestamp) &&
      sample.timestamp >= start.getTime() &&
      sample.timestamp < windowEndExclusive.getTime() &&
      sample.level !== null &&
      Number.isFinite(sample.level) &&
      sample.level >= 0 && sample.level <= 1)
    .sort((a, b) => a.timestamp - b.timestamp);

  const bucketFor = (timestamp: number) => {
    const sampleDay = localDayStart(new Date(timestamp));
    const dayOffset = Math.round((
      Date.UTC(sampleDay.getFullYear(), sampleDay.getMonth(), sampleDay.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
    ) / DAY_MS);
    const index = period === 'week' ? dayOffset : Math.floor(dayOffset / 7);
    return buckets[Math.max(0, Math.min(bucketCount - 1, index))];
  };

  for (const sample of valid) {
    const bucket = bucketFor(sample.timestamp);
    bucket.sampleCount += 1;
    bucket.firstSampleAt = bucket.firstSampleAt === null ? sample.timestamp : Math.min(bucket.firstSampleAt, sample.timestamp);
    bucket.lastSampleAt = bucket.lastSampleAt === null ? sample.timestamp : Math.max(bucket.lastSampleAt, sample.timestamp);
  }

  let totalCharged = 0;
  let totalDischarged = 0;
  let hasAnyCharge = false;
  let hasAnyDischarge = false;

  for (let index = 1; index < valid.length; index += 1) {
    const previous = valid[index - 1];
    const current = valid[index];
    const elapsed = current.timestamp - previous.timestamp;
    if (elapsed < MIN_INTERVAL_MS || elapsed > MAX_INTERVAL_MS) continue;

    const deltaPercent = ((current.level as number) - (previous.level as number)) * 100;
    const bucket = bucketFor(current.timestamp);
    const sameUnpluggedWindow = previous.batteryState === STATE_UNPLUGGED &&
      current.batteryState === STATE_UNPLUGGED;
    const sameChargingWindow = [STATE_CHARGING, STATE_FULL].includes(previous.batteryState) &&
      [STATE_CHARGING, STATE_FULL].includes(current.batteryState);

    if (sameUnpluggedWindow && deltaPercent < 0) {
      const amount = Math.abs(deltaPercent);
      bucket.discharged += amount;
      bucket.hasDischarge = true;
      totalDischarged += amount;
      hasAnyDischarge = true;
    } else if (sameChargingWindow && deltaPercent > 0) {
      bucket.charged += deltaPercent;
      bucket.hasCharge = true;
      totalCharged += deltaPercent;
      hasAnyCharge = true;
    }
  }

  const relevantSessions = sessions.filter((session) => {
    const timestamp = Date.parse(session.startedAt);
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime() + DAY_MS;
  });
  const completedSessions = relevantSessions.filter((session) =>
    session.status === 'completed' && session.endedAt !== null &&
    Number.isFinite(Date.parse(session.endedAt)),
  );
  const sessionGains = completedSessions
    .filter((session) => session.startLevel !== null && session.endLevel !== null &&
      Number.isFinite(session.startLevel) && Number.isFinite(session.endLevel) &&
      session.endLevel >= session.startLevel)
    .map((session) => (session.endLevel as number - (session.startLevel as number)) * 100);
  const observedSessionDurations = completedSessions
    .map((session) => Date.parse(session.endedAt as string) - Date.parse(session.startedAt))
    .filter((duration) => duration > 0 && duration <= 6 * 60 * 60 * 1000);
  const completedObservedMinutes = observedSessionDurations.reduce((sum, duration) => sum + duration / 60000, 0);

  const totalSampleCount = valid.length;
  const firstSample = valid[0]?.timestamp ?? null;
  const lastSample = valid[valid.length - 1]?.timestamp ?? null;
  const observedDays = new Set(valid.map((sample) => {
    const date = new Date(sample.timestamp);
    return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
  })).size;
  const coverage: TrendCoverage = period === 'week'
    ? observedDays >= 5 && totalSampleCount >= 15 ? 'good'
      : observedDays >= 3 && totalSampleCount >= 6 ? 'moderate' : 'low'
    : observedDays >= 20 && totalSampleCount >= 60 ? 'good'
      : observedDays >= 8 && totalSampleCount >= 24 ? 'moderate' : 'low';

  return {
    period,
    startAt: start.toISOString(),
    endAt: new Date(windowEndExclusive.getTime() - 1).toISOString(),
    buckets: buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      chargedPercent: bucket.hasCharge ? round(bucket.charged) : null,
      dischargedPercent: bucket.hasDischarge ? round(bucket.discharged) : null,
      sampleCount: bucket.sampleCount,
      coverage: coverageFor(bucket.sampleCount, bucket.firstSampleAt, bucket.lastSampleAt),
    })),
    sampleCount: totalSampleCount,
    observedDays,
    coverage,
    chargedPercent: hasAnyCharge ? round(totalCharged) : null,
    dischargedPercent: hasAnyDischarge ? round(totalDischarged) : null,
    chargingSessionCount: relevantSessions.length,
    completedSessionCount: completedSessions.length,
    averageSessionGainPercent: sessionGains.length
      ? round(sessionGains.reduce((sum, gain) => sum + gain, 0) / sessionGains.length)
      : null,
    totalCompletedObservedMinutes: observedSessionDurations.length ? Math.round(completedObservedMinutes) : null,
    explanation: totalSampleCount < 2
      ? 'Not enough saved readings for this period. Enable Battery history and keep VoltGuard open to collect real observations.'
      : coverage === 'low'
        ? 'History coverage is limited. Totals include only valid adjacent readings and may under-represent actual charging or discharge.'
        : 'Totals are calculated from adjacent saved readings with matching charging state and gaps no longer than six hours. Unobserved periods are excluded.',
  };
}
