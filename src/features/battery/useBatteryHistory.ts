import { useCallback, useEffect, useState } from 'react';
import {
  isBatteryHistoryEnabled,
  setBatteryHistoryEnabled,
  type ChargingSession,
  getChargingSessions,
} from './battery.history';
import { batteryTelemetryProvider } from './expo-battery.provider';
import { recordBatterySnapshot } from './battery.history';
import { getRecentBatterySamples, type StoredBatterySample } from './battery.repository';

export function useBatteryHistory() {
  const [enabled, setEnabled] = useState(false);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [samples, setSamples] = useState<StoredBatterySample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextEnabled = await isBatteryHistoryEnabled();
      setEnabled(nextEnabled);
      setSessions(nextEnabled ? await getChargingSessions() : []);
      setSamples(nextEnabled ? await getRecentBatterySamples(20) : []);
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
      setSessions([]);
      setSamples([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEnabled = useCallback(async (nextEnabled: boolean) => {
    try {
      await setBatteryHistoryEnabled(nextEnabled);
      setEnabled(nextEnabled);
      if (!nextEnabled) {
        setSessions([]);
        setSamples([]);
      } else {
        const currentSnapshot = await batteryTelemetryProvider.getSnapshot();
        await recordBatterySnapshot(currentSnapshot);
        setSessions(await getChargingSessions());
        setSamples(await getRecentBatterySamples(20));
      }
      setIsAvailable(true);
      return true;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { enabled, sessions, samples, isLoading, isAvailable, refresh, updateEnabled };
}
