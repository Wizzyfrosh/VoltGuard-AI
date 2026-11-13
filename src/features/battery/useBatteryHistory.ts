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
      // The preference update and opt-out deletion are transactional. Once this
      // succeeds, the user's choice is saved even if a best-effort first sample
      // or subsequent history refresh cannot be completed.
      await setBatteryHistoryEnabled(nextEnabled);
      if (currentRequest !== requestId.current) return true;

      setEnabled(nextEnabled);
      if (!nextEnabled) {
        setSessions([]);
        setSamples([]);
        setIsAvailable(true);
        return true;
      }

      setIsAvailable(true);
      try {
        const currentSnapshot = await batteryTelemetryProvider.getSnapshot();
        await recordBatterySnapshot(currentSnapshot);
      } catch {
        // Opt-in remains saved; the regular telemetry publisher can record
        // the next eligible snapshot.
      }

      try {
        const nextSessions = await getChargingSessions();
        const nextSamples = await getRecentBatterySamples(20);
        if (currentRequest === requestId.current) {
          setSessions(nextSessions);
          setSamples(nextSamples);
          setIsAvailable(true);
        }
      } catch {
        if (currentRequest === requestId.current) {
          setSessions([]);
          setSamples([]);
          setIsAvailable(false);
        }
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
