import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { runBatteryHistoryMutation } from './battery.history-consent';

const DATABASE_NAME = 'voltguard.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getWebPreference(key: string): string | null {
  try {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
    return globalThis.localStorage.getItem('voltguard:' + key);
  } catch {
    throw new Error('VoltGuard could not read this setting from browser storage. Check private browsing or storage permissions.');
  }
}

function setWebPreference(key: string, value: string): void {
  try {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
    globalThis.localStorage.setItem('voltguard:' + key, value);
  } catch {
    throw new Error('VoltGuard could not save this setting in browser storage. Check private browsing or storage permissions.');
  }
}

async function openBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('Local battery history is not enabled on web yet. A browser-specific persistence adapter is required.');
  }

  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await database.execAsync(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS battery_samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          observed_at TEXT NOT NULL,
          platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web', 'unknown')),
          level REAL CHECK (level IS NULL OR (level >= 0 AND level <= 1)),
          battery_state INTEGER NOT NULL,
          low_power_mode INTEGER CHECK (low_power_mode IS NULL OR low_power_mode IN (0, 1)),
          source TEXT NOT NULL CHECK (source IN ('expo-battery', 'native', 'unavailable')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_battery_samples_observed_at ON battery_samples (observed_at DESC);
        CREATE TABLE IF NOT EXISTS user_preferences (
          preference_key TEXT PRIMARY KEY NOT NULL,
          preference_value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS charging_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          start_level REAL CHECK (start_level IS NULL OR (start_level >= 0 AND start_level <= 1)),
          end_level REAL CHECK (end_level IS NULL OR (end_level >= 0 AND end_level <= 1)),
          status TEXT NOT NULL CHECK (status IN ('charging', 'completed')),
          source TEXT NOT NULL CHECK (source IN ('expo-battery', 'native')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_charging_sessions_started_at ON charging_sessions (started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_charging_sessions_active ON charging_sessions (status, ended_at);
      `);
      return database;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export async function getBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  return openBatteryDatabase();
}

export async function getBatteryPreference(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return getWebPreference(key);
  const database = await openBatteryDatabase();
  const row = await database.getFirstAsync<{ preference_value: string }>(
    'SELECT preference_value FROM user_preferences WHERE preference_key = ?',
    key,
  );
  return row?.preference_value ?? null;
}

export async function setBatteryPreference(key: string, value: string): Promise<void> {
  // Consent changes must use setBatteryHistoryEnabled(), which atomically
  // persists the choice and deletes history on opt-out. The generic setter
  // must not provide a path around that data-lifecycle contract.
  if (key === 'battery_history_enabled') {
    throw new Error('Use setBatteryHistoryEnabled() to change battery-history consent.');
  }
  if (Platform.OS === 'web') { setWebPreference(key, value); return; }
  const database = await openBatteryDatabase();
  await runBatteryHistoryMutation(() => database.runAsync(
    'INSERT INTO user_preferences (preference_key, preference_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(preference_key) DO UPDATE SET preference_value = excluded.preference_value, updated_at = CURRENT_TIMESTAMP',
    key,
    value,
  ));
}
