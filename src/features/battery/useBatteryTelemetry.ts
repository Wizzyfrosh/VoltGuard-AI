import { useCallback, useEffect, useState } from 'react';
import * as ExpoBattery from 'expo-battery';
import { batteryTelemetryProvider } from './expo-battery.provider';
import type { BatterySnapshot } from './battery.types';

const emptySnapshot: BatterySnapshot = {
  platform: 'unknown',
  level: null,
  state: ExpoBattery.BatteryState.UNKNOWN,
  lowPowerMode: null,
  observedAt: '',
  source: 'unavailable',
  capabilities: {
    batteryLevel: 'unavailable',
    chargingState: 'unavailable',
    lowPowerMode: 'unavailable',
    temperature: 'not-implemented',
    voltage: 'not-implemented',
    batteryHealth: 'not-implemented',
    cycleCount: 'not-implemented',
    perAppPowerUsage: 'not-implemented',
  },
};

export function useBatteryTelemetry() {
  const [snapshot, setSnapshot] = useState<BatterySnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextSnapshot = await batteryTelemetryProvider.getSnapshot();
      setSnapshot(nextSnapshot);
      setHasError(nextSnapshot.source === 'unavailable');
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = batteryTelemetryProvider.subscribe((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
        setHasError(nextSnapshot.source === 'unavailable');
        setIsLoading(false);
      }
    });

    void batteryTelemetryProvider.getSnapshot()
      .then((nextSnapshot) => {
        if (mounted) {
          setSnapshot(nextSnapshot);
          setHasError(nextSnapshot.source === 'unavailable');
        }
      })
      .catch(() => {
        if (mounted) setHasError(true);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { ...snapshot, isLoading, hasError, refresh };
}
