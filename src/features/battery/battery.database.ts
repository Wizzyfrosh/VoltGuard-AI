import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'voltguard.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  const database = await databasePromise;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
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

    CREATE INDEX IF NOT EXISTS idx_battery_samples_observed_at
      ON battery_samples (observed_at DESC);
  `);

  return database;
}

export async function getBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  return openBatteryDatabase();
}
