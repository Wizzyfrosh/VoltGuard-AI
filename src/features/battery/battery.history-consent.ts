/** A single strict parser for the persisted opt-in value. Unknown values fail closed. */
export function hasBatteryHistoryConsent(value: string | null | undefined): boolean {
  return value === 'true';
}

/** Keep caller-provided SQL limits finite, integral, and within the query's bound. */
export function normalizeBatteryHistoryLimit(
  value: number,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), maximum));
}

/** ISO-8601 UTC cutoff shared by history reads and retention cleanup. */
export function getBatteryHistoryCutoff(now = Date.now(), retentionDays = 30): string {
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const safeDays = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 30;
  return new Date(safeNow - safeDays * 86400000).toISOString();
}

/*
 * Serialize every in-process history mutation. SQLite transactions protect
 * individual operations; this queue additionally gives opt-out/deletion a
 * deterministic order relative to telemetry and manual saves in this JS runtime.
 */
let mutationQueue: Promise<void> = Promise.resolve();

export function runBatteryHistoryMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}
