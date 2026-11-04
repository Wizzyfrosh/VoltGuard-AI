import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'voltguard.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('Local battery history is not enabled on web yet. A browser-specific persistence adapter is required.');
  }

  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  const database = await databasePromise;
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
}

export async function getBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  return openBatteryDatabase();
}
