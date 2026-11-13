import { Platform } from 'react-native';
import { getBatteryDatabase, getBatteryPreference } from './battery.database';
import type { BatterySnapshot } from './battery.types';
import { getBatteryHistoryCutoff, hasBatteryHistoryConsent, normalizeBatteryHistoryLimit, runBatteryHistoryMutation } from './battery.history-consent';

export interface StoredBatterySample {
  id: number;
  observedAt: string;
  platform: BatterySnapshot['platform'];
  level: number | null;
  batteryState: number;
  lowPowerMode: boolean | null;
  source: BatterySnapshot['source'];
}

interface BatterySampleRow {
  id: number;
  observed_at: string;
  platform: BatterySnapshot['platform'];
  level: number | null;
  battery_state: number;
  low_power_mode: number | null;
  source: BatterySnapshot['source'];
}

function mapRow(row: BatterySampleRow): StoredBatterySample {
  return {
    id: row.id,
    observedAt: row.observed_at,
    platform: row.platform,
    level: row.level,
    batteryState: row.battery_state,
    lowPowerMode: row.low_power_mode === null ? null : row.low_power_mode === 1,
    source: row.source,
  };
}

/**
 * Persists one explicitly supplied snapshot only after the user has opted in.
 * This repository never starts collection or schedules background work.
 */
export async function saveBatterySample(snapshot: BatterySnapshot): Promise<number> {
  if (Platform.OS === 'web') throw new Error('Battery history is not available in the web build.');
  if (snapshot.source === 'unavailable') throw new Error('Unavailable battery readings cannot be saved.');
  const database = await getBatteryDatabase();
  let insertedId = 0;

  await runBatteryHistoryMutation(() => database.withTransactionAsync(async () => {
    const preference = await database.getFirstAsync<{ preference_value: string }>(
      'SELECT preference_value FROM user_preferences WHERE preference_key = ?',
      'battery_history_enabled',
    );
    if (!hasBatteryHistoryConsent(preference?.preference_value)) {
      throw new Error('Enable battery history before saving samples.');
    }
    const result = await database.runAsync(
      `INSERT INTO battery_samples
        (observed_at, platform, level, battery_state, low_power_mode, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      snapshot.observedAt,
      snapshot.platform,
      snapshot.level,
      snapshot.state,
      snapshot.lowPowerMode === null ? null : snapshot.lowPowerMode ? 1 : 0,
      snapshot.source,
    );
    insertedId = result.lastInsertRowId;
    const cutoff = getBatteryHistoryCutoff();
    await database.runAsync('DELETE FROM battery_samples WHERE observed_at < ?', cutoff);
    await database.runAsync('DELETE FROM charging_sessions WHERE started_at < ?', cutoff);
  }));

  return insertedId;
}

export async function getRecentBatterySamples(limit = 100): Promise<StoredBatterySample[]> {
  if (Platform.OS === 'web') return [];
  const safeLimit = normalizeBatteryHistoryLimit(limit, 100, 1000);
  const cutoff = getBatteryHistoryCutoff();
  const database = await getBatteryDatabase();
  await runBatteryHistoryMutation(() => database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM battery_samples WHERE observed_at < ?', cutoff);
    await database.runAsync('DELETE FROM charging_sessions WHERE started_at < ?', cutoff);
  }));
  const rows = await database.getAllAsync<BatterySampleRow>(
    `SELECT id, observed_at, platform, level, battery_state, low_power_mode, source
     FROM battery_samples
     WHERE observed_at >= ?
       AND EXISTS (
       SELECT 1 FROM user_preferences
       WHERE preference_key = 'battery_history_enabled'
         AND preference_value = 'true'
     )
     ORDER BY observed_at DESC, id DESC
     LIMIT ?`,
    cutoff,
    safeLimit,
  );

  return rows.map(mapRow);
}

export async function deleteBatterySamplesBefore(isoTimestamp: string): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (!Number.isFinite(Date.parse(isoTimestamp))) {
    throw new Error('A valid ISO timestamp is required.');
  }
  const database = await getBatteryDatabase();
  const result = await runBatteryHistoryMutation(() => database.runAsync(
    'DELETE FROM battery_samples WHERE observed_at < ?',
    isoTimestamp,
  ));

  return result.changes;
}
