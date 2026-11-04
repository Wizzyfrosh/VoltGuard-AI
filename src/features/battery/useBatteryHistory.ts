import { useCallback, useEffect, useState } from 'react';
import {
  isBatteryHistoryEnabled,
  setBatteryHistoryEnabled,
  type ChargingSession,
  getChargingSessions,
} from './battery.history';

export function useBatteryHistory() {
  const [enabled, setEnabled] = useState(false);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextEnabled = await isBatteryHistoryEnabled();
      setEnabled(nextEnabled);
      setSessions(nextEnabled ? await getChargingSessions() : []);
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEnabled = useCallback(async (nextEnabled: boolean) => {
    try {
      await setBatteryHistoryEnabled(nextEnabled);
      setEnabled(nextEnabled);
      if (!nextEnabled) setSessions([]);
      else setSessions(await getChargingSessions());
      setIsAvailable(true);
      return true;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { enabled, sessions, isLoading, isAvailable, refresh, updateEnabled };
}
