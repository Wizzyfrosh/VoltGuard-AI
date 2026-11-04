import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { getBatteryDatabase } from './battery.database';
import type { BatterySnapshot } from './battery.types';
import { getChargingTransition } from './battery.session';

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
  const db = await getBatteryDatabase();
  const row = await db.getFirstAsync<{ preference_value: string }>(
    'SELECT preference_value FROM user_preferences WHERE preference_key = ?',
    HISTORY_PREFERENCE,
  );
  return row?.preference_value === 'true';
}

export async function setBatteryHistoryEnabled(enabled: boolean): Promise<void> {
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
  const db = await getBatteryDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM battery_samples');
    await db.runAsync('DELETE FROM charging_sessions');
  });
}
