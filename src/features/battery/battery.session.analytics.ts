import type { ChargingSession } from './battery.history';

export interface ChargingSessionPeriodSummary {
  sessionCount: number;
  averageGainPercent: number | null;
  averageDurationMinutes: number | null;
  averageChargeRatePercentPerHour: number | null;
}

export interface ChargingSessionComparison {
  current: ChargingSessionPeriodSummary;
  previous: ChargingSessionPeriodSummary;
  gainChangePercentPoints: number | null;
  durationChangeMinutes: number | null;
  explanation: string;
}

function summarize(sessions: ChargingSession[], start: number, end: number): ChargingSessionPeriodSummary {
  const completed = sessions.filter((session) => {
    if (session.status !== 'completed' || !session.endedAt) return false;
    const startedAt = Date.parse(session.startedAt);
    const endedAt = Date.parse(session.endedAt);
    return Number.isFinite(startedAt) && Number.isFinite(endedAt) &&
      startedAt >= start && startedAt < end && endedAt > startedAt &&
      session.startLevel !== null && session.endLevel !== null &&
      Number.isFinite(session.startLevel) && Number.isFinite(session.endLevel) &&
      session.startLevel >= 0 && session.startLevel <= 1 &&
      session.endLevel >= session.startLevel && session.endLevel <= 1;
  }).map((session) => {
    const minutes = (Date.parse(session.endedAt as string) - Date.parse(session.startedAt)) / 60000;
    const gain = ((session.endLevel as number) - (session.startLevel as number)) * 100;
    return { minutes, gain, rate: minutes > 0 ? gain / (minutes / 60) : null };
  });

  if (!completed.length) {
    return { sessionCount: 0, averageGainPercent: null, averageDurationMinutes: null, averageChargeRatePercentPerHour: null };
  }
  return {
    sessionCount: completed.length,
    averageGainPercent: Math.round(completed.reduce((sum, item) => sum + item.gain, 0) / completed.length * 10) / 10,
    averageDurationMinutes: Math.round(completed.reduce((sum, item) => sum + item.minutes, 0) / completed.length),
    averageChargeRatePercentPerHour: Math.round(completed.reduce((sum, item) => sum + (item.rate ?? 0), 0) / completed.length * 10) / 10,
  };
}

/** Compare completed, observed sessions in two adjacent seven-day windows. */
export function compareChargingSessions(sessions: ChargingSession[], now = Date.now()): ChargingSessionComparison {
  const currentEnd = now;
  const currentStart = now - 7 * 86400000;
  const previousStart = now - 14 * 86400000;
  const current = summarize(sessions, currentStart, currentEnd);
  const previous = summarize(sessions, previousStart, currentStart);
  const hasComparison = current.sessionCount > 0 && previous.sessionCount > 0;

  return {
    current,
    previous,
    gainChangePercentPoints: hasComparison && current.averageGainPercent !== null && previous.averageGainPercent !== null
      ? Math.round((current.averageGainPercent - previous.averageGainPercent) * 10) / 10 : null,
    durationChangeMinutes: hasComparison && current.averageDurationMinutes !== null && previous.averageDurationMinutes !== null
      ? current.averageDurationMinutes - previous.averageDurationMinutes : null,
    explanation: hasComparison
      ? 'Compares completed sessions observed in the latest seven days with the preceding seven days. It is descriptive, not a charger-performance test.'
      : 'A comparison needs at least one completed session with valid start/end levels in each seven-day period. Incomplete sessions are excluded.',
  };
}

/** Charge rate for one completed session; null means it cannot be calculated reliably. */
export function getChargingSessionRate(session: ChargingSession): number | null {
  if (session.status !== 'completed' || !session.endedAt ||
      session.startLevel === null || session.endLevel === null ||
      !Number.isFinite(session.startLevel) || !Number.isFinite(session.endLevel) ||
      session.startLevel < 0 || session.endLevel > 1 || session.endLevel < session.startLevel) return null;
  const duration = Date.parse(session.endedAt) - Date.parse(session.startedAt);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const rate = ((session.endLevel - session.startLevel) * 100) / (duration / 3600000);
  return Number.isFinite(rate) ? Math.round(rate * 10) / 10 : null;
}
