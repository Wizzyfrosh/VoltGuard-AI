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
  totalCompletedChargingMinutes: number | null;
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
  const start = new Date(end.getTime() - (dayCount - 1) * DAY_MS);
  const bucketCount = period === 'week' ? 7 : 5;
  const bucketDays = period === 'week' ? 1 : 7;

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * bucketDays * DAY_MS);
    const bucketEnd = new Date(Math.min(
      end.getTime() + DAY_MS - 1,
      bucketStart.getTime() + bucketDays * DAY_MS - 1,
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
      sample.timestamp < end.getTime() + DAY_MS &&
      sample.level !== null &&
      Number.isFinite(sample.level) &&
      sample.level >= 0 && sample.level <= 1)
    .sort((a, b) => a.timestamp - b.timestamp);

  const bucketFor = (timestamp: number) => {
    const dayOffset = Math.floor((localDayStart(new Date(timestamp)).getTime() - start.getTime()) / DAY_MS);
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
  const completedMinutes = completedSessions.reduce((sum, session) => {
    const duration = Date.parse(session.endedAt as string) - Date.parse(session.startedAt);
    return sum + (duration > 0 ? duration / 60000 : 0);
  }, 0);

  const totalSampleCount = valid.length;
  const firstSample = valid[0]?.timestamp ?? null;
  const lastSample = valid[valid.length - 1]?.timestamp ?? null;
  const coverage = coverageFor(totalSampleCount, firstSample, lastSample);

  return {
    period,
    startAt: start.toISOString(),
    endAt: new Date(end.getTime() + DAY_MS - 1).toISOString(),
    buckets: buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      chargedPercent: bucket.hasCharge ? round(bucket.charged) : null,
      dischargedPercent: bucket.hasDischarge ? round(bucket.discharged) : null,
      sampleCount: bucket.sampleCount,
      coverage: coverageFor(bucket.sampleCount, bucket.firstSampleAt, bucket.lastSampleAt),
    })),
    sampleCount: totalSampleCount,
    coverage,
    chargedPercent: hasAnyCharge ? round(totalCharged) : null,
    dischargedPercent: hasAnyDischarge ? round(totalDischarged) : null,
    chargingSessionCount: relevantSessions.length,
    completedSessionCount: completedSessions.length,
    averageSessionGainPercent: sessionGains.length
      ? round(sessionGains.reduce((sum, gain) => sum + gain, 0) / sessionGains.length)
      : null,
    totalCompletedChargingMinutes: completedSessions.length ? Math.round(completedMinutes) : null,
    explanation: totalSampleCount < 2
      ? 'Not enough saved readings for this period. Enable Battery history and keep VoltGuard open to collect real observations.'
      : coverage === 'low'
        ? 'History coverage is limited. Totals include only valid adjacent readings and may under-represent actual charging or discharge.'
        : 'Totals are calculated from adjacent saved readings with matching charging state and gaps no longer than six hours. Unobserved periods are excluded.',
  };
}
