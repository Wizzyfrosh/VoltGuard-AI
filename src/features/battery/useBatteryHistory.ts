import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    try {
      const nextEnabled = await isBatteryHistoryEnabled();
      const nextSessions = nextEnabled ? await getChargingSessions() : [];
      const nextSamples = nextEnabled ? await getRecentBatterySamples(20) : [];
      if (currentRequest !== requestId.current) return;
      setEnabled(nextEnabled);
      setSessions(nextSessions);
      setSamples(nextSamples);
      setIsAvailable(true);
    } catch {
      if (currentRequest === requestId.current) {
        setIsAvailable(false);
        setSessions([]);
        setSamples([]);
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, []);

  const updateEnabled = useCallback(async (nextEnabled: boolean) => {
    const currentRequest = ++requestId.current;
    try {
      await setBatteryHistoryEnabled(nextEnabled);
      if (!nextEnabled) {
        if (currentRequest === requestId.current) {
          setEnabled(false);
          setSessions([]);
          setSamples([]);
          setIsAvailable(true);
        }
        return true;
      }
      const currentSnapshot = await batteryTelemetryProvider.getSnapshot();
      await recordBatterySnapshot(currentSnapshot);
      const nextSessions = await getChargingSessions();
      const nextSamples = await getRecentBatterySamples(20);
      if (currentRequest === requestId.current) {
        setEnabled(true);
        setSessions(nextSessions);
        setSamples(nextSamples);
        setIsAvailable(true);
      }
      return true;
    } catch {
      if (currentRequest === requestId.current) setIsAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  return { enabled, sessions, samples, isLoading, isAvailable, refresh, updateEnabled };
}
