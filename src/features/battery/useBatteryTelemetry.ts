import { useCallback, useEffect, useState } from 'react';
import * as ExpoBattery from 'expo-battery';
import { batteryTelemetryProvider } from './expo-battery.provider';
import type { BatterySnapshot } from './battery.types';
import { recordBatterySnapshot } from './battery.history';

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
  androidDiagnostics: null,
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
    let receivedLiveUpdate = false;
    const unsubscribe = batteryTelemetryProvider.subscribe((nextSnapshot) => {
      if (mounted) {
        receivedLiveUpdate = true;
        setSnapshot(nextSnapshot);
        setHasError(nextSnapshot.source === 'unavailable');
        setIsLoading(false);
        void recordBatterySnapshot(nextSnapshot).catch(() => {
          // Telemetry remains available even if local history storage fails.
        });
      }
    });

    void batteryTelemetryProvider.getSnapshot()
      .then((nextSnapshot) => {
        if (mounted && !receivedLiveUpdate) {
          setSnapshot(nextSnapshot);
          setHasError(nextSnapshot.source === 'unavailable');
          void recordBatterySnapshot(nextSnapshot).catch(() => {
            // Storage failures must not break live battery monitoring.
          });
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
