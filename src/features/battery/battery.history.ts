import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { getBatteryDatabase } from './battery.database';
import type { BatterySnapshot } from './battery.types';
import { getChargingTransition } from './battery.session';
import { analyzeBatteryDrain, type BatteryDrainAnalysis } from './battery.analysis';
import { buildBatteryTrendReport, type BatteryTrendPeriod, type BatteryTrendReport } from './battery.trends';

const HISTORY_PREFERENCE = 'battery_history_enabled';
const RETENTION_DAYS = 30;

export interface ChargingSession {
  id: number;
  startedAt: string;
  endedAt: string | null;
  startLevel: number | null;
  endLevel: number | null;
  status: 'charging' | 'completed';
  source: 'expo-battery' | 'native';
}

interface ChargingSessionRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  start_level: number | null;
  end_level: number | null;
  status: 'charging' | 'completed';
  source: 'expo-battery' | 'native';
}

function mapSession(row: ChargingSessionRow): ChargingSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    startLevel: row.start_level,
    endLevel: row.end_level,
    status: row.status,
    source: row.source,
  };
}

export async function isBatteryHistoryEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const db = await getBatteryDatabase();
  const row = await db.getFirstAsync<{ preference_value: string }>(
    'SELECT preference_value FROM user_preferences WHERE preference_key = ?',
    HISTORY_PREFERENCE,
  );
  return row?.preference_value === 'true';
}

export async function setBatteryHistoryEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Battery history is not available in the web build.');
  const db = await getBatteryDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO user_preferences (preference_key, preference_value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(preference_key) DO UPDATE SET
         preference_value = excluded.preference_value,
         updated_at = CURRENT_TIMESTAMP`,
      HISTORY_PREFERENCE,
      enabled ? 'true' : 'false',
    );

    if (!enabled) {
      await db.runAsync('DELETE FROM battery_samples');
      await db.runAsync('DELETE FROM charging_sessions');
    }
  });
}

/** Save foreground telemetry only after explicit opt-in. No background task is registered. */
export async function recordBatterySnapshot(snapshot: BatterySnapshot): Promise<void> {
  if (Platform.OS === 'web' || snapshot.source === 'unavailable') return;
  const db = await getBatteryDatabase();

  await db.withTransactionAsync(async () => {
    const preference = await db.getFirstAsync<{ preference_value: string }>(
      'SELECT preference_value FROM user_preferences WHERE preference_key = ?',
      HISTORY_PREFERENCE,
    );
    if (preference?.preference_value !== 'true') return;

    // Enabling history can race the telemetry hook's first publish. Treat an
    // identical source/timestamp as one observation rather than two samples.
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM battery_samples WHERE observed_at = ? AND source = ? LIMIT 1',
      snapshot.observedAt,
      snapshot.source,
    );
    if (existing) return;

    await db.runAsync(
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

    const active = await db.getFirstAsync<ChargingSessionRow>(
      `SELECT id, started_at, ended_at, start_level, end_level, status, source
       FROM charging_sessions WHERE status = 'charging' AND ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
    );

    const isCharging = snapshot.state === Battery.BatteryState.CHARGING ||
      snapshot.state === Battery.BatteryState.FULL;
    const isUnplugged = snapshot.state === Battery.BatteryState.UNPLUGGED;
    const transition = getChargingTransition(isCharging, isUnplugged, Boolean(active));

    if (transition === 'start') {
      await db.runAsync(
        `INSERT INTO charging_sessions (started_at, start_level, end_level, status, source)
         VALUES (?, ?, ?, 'charging', ?)`,
        snapshot.observedAt,
        snapshot.level,
        snapshot.level,
        snapshot.source === 'native' ? 'native' : 'expo-battery',
      );
    } else if (transition === 'update' && active) {
      await db.runAsync('UPDATE charging_sessions SET end_level = ? WHERE id = ?', snapshot.level, active.id);
    } else if (transition === 'finish' && active) {
      await db.runAsync(
        `UPDATE charging_sessions
         SET ended_at = ?, end_level = ?, status = 'completed'
         WHERE id = ? AND ended_at IS NULL`,
        snapshot.observedAt,
        snapshot.level,
        active.id,
      );
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    await db.runAsync('DELETE FROM battery_samples WHERE observed_at < ?', cutoff);
    await db.runAsync(
      "DELETE FROM charging_sessions WHERE started_at < ?",
      cutoff,
    );
  });
}

export async function getChargingSessions(limit = 50): Promise<ChargingSession[]> {
  if (Platform.OS === 'web') return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
  const db = await getBatteryDatabase();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  await db.runAsync('DELETE FROM battery_samples WHERE observed_at < ?', cutoff);
  await db.runAsync(
    "DELETE FROM charging_sessions WHERE started_at < ?",
    cutoff,
  );
  const rows = await db.getAllAsync<ChargingSessionRow>(
    `SELECT id, started_at, ended_at, start_level, end_level, status, source
     FROM charging_sessions ORDER BY started_at DESC LIMIT ?`,
    safeLimit,
  );
  return rows.map(mapSession);
}

export async function clearBatteryHistory(): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getBatteryDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM battery_samples');
    await db.runAsync('DELETE FROM charging_sessions');
  });
}

export async function getBatteryDrainAnalysis(): Promise<BatteryDrainAnalysis> {
  if (Platform.OS === 'web') {
    return analyzeBatteryDrain([]);
  }
  const db = await getBatteryDatabase();
  const enabled = await isBatteryHistoryEnabled();
  if (!enabled) return analyzeBatteryDrain([]);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<{ observed_at: string; level: number | null; battery_state: number }>(
    'SELECT observed_at, level, battery_state FROM battery_samples WHERE observed_at >= ? ORDER BY observed_at ASC LIMIT 500',
    cutoff,
  );
  return analyzeBatteryDrain(rows.map((row) => ({
    observedAt: row.observed_at,
    level: row.level,
    isUnplugged: row.battery_state === Battery.BatteryState.UNPLUGGED,
  })));
}


/** Read opted-in local samples for the 30-day trend window. No exports or uploads. */
export async function getBatteryTrendReport(period: BatteryTrendPeriod): Promise<BatteryTrendReport> {
  const empty = buildBatteryTrendReport([], [], period);
  if (Platform.OS === 'web') return empty;
  const enabled = await isBatteryHistoryEnabled();
  if (!enabled) return empty;

  const db = await getBatteryDatabase();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = await db.getAllAsync<{
    observed_at: string;
    level: number | null;
    battery_state: number;
  }>(
    `SELECT observed_at, level, battery_state
     FROM battery_samples
     WHERE observed_at >= ?
     ORDER BY observed_at DESC, id DESC
     LIMIT 5000`,
    cutoff,
  );
  const samples = rows.reverse().map((row) => ({
    observedAt: row.observed_at,
    level: row.level,
    batteryState: row.battery_state,
  }));
  const sessions = await getChargingSessions(200);
  return buildBatteryTrendReport(samples, sessions, period);
}
