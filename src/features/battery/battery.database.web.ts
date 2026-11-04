import type * as SQLite from 'expo-sqlite';

/** Browser builds intentionally keep native SQLite out of the web bundle. */
export async function getBatteryDatabase(): Promise<SQLite.SQLiteDatabase> {
  throw new Error('Local battery history is not supported in the web build.');
}

export async function getBatteryPreference(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(`voltguard:${key}`); } catch { return null; }
}

export async function setBatteryPreference(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(`voltguard:${key}`, value); }
  catch { throw new Error('Browser storage is unavailable.'); }
}
