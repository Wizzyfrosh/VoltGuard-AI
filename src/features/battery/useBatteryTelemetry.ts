import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
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
      void recordBatterySnapshot(nextSnapshot).catch(() => {
        // Local history storage must not block live diagnostics.
      });
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
        setSnapshot((current) => {
          // A partial Expo event must not erase a valid native BatteryManager reading.
          const level = nextSnapshot.level ?? current.level;
          const state = nextSnapshot.state !== ExpoBattery.BatteryState.UNKNOWN
            ? nextSnapshot.state
            : current.state;
          const androidDiagnostics = nextSnapshot.androidDiagnostics ?? current.androidDiagnostics;
          return {
            ...nextSnapshot,
            level,
            state,
            lowPowerMode: nextSnapshot.lowPowerMode ?? current.lowPowerMode,
            androidDiagnostics,
            capabilities: {
              ...nextSnapshot.capabilities,
              batteryLevel: level !== null ? 'available' : nextSnapshot.capabilities.batteryLevel,
              chargingState: state !== ExpoBattery.BatteryState.UNKNOWN ? 'available' : nextSnapshot.capabilities.chargingState,
              lowPowerMode: nextSnapshot.lowPowerMode !== null || current.lowPowerMode !== null
                ? 'available'
                : nextSnapshot.capabilities.lowPowerMode,
              temperature: androidDiagnostics?.temperatureCelsius !== null && androidDiagnostics?.temperatureCelsius !== undefined
                ? 'available'
                : nextSnapshot.capabilities.temperature,
              voltage: androidDiagnostics?.voltageMilliVolts !== null && androidDiagnostics?.voltageMilliVolts !== undefined
                ? 'available'
                : nextSnapshot.capabilities.voltage,
              batteryHealth: androidDiagnostics?.health
                ? 'available'
                : nextSnapshot.capabilities.batteryHealth,
            },
            source: androidDiagnostics !== null ? 'native' : nextSnapshot.source,
          };
        });
        setHasError(nextSnapshot.source === 'unavailable');
        void recordBatterySnapshot(nextSnapshot).catch(() => {
          // Telemetry remains available even if local history storage fails.
        });
        setIsLoading(false);
      }
    });

    void batteryTelemetryProvider.getSnapshot()
      .then((nextSnapshot) => {
        if (mounted) {
          setSnapshot((current) => ({
            ...nextSnapshot,
            level: current.level ?? nextSnapshot.level,
            state: current.state !== ExpoBattery.BatteryState.UNKNOWN ? current.state : nextSnapshot.state,
            lowPowerMode: current.lowPowerMode ?? nextSnapshot.lowPowerMode,
            androidDiagnostics: nextSnapshot.androidDiagnostics ?? current.androidDiagnostics,
            capabilities: {
              ...nextSnapshot.capabilities,
              batteryLevel: current.level !== null ? 'available' : nextSnapshot.capabilities.batteryLevel,
              chargingState: current.state !== ExpoBattery.BatteryState.UNKNOWN ? 'available' : nextSnapshot.capabilities.chargingState,
              lowPowerMode: current.lowPowerMode !== null ? 'available' : nextSnapshot.capabilities.lowPowerMode,
              temperature: current.androidDiagnostics?.temperatureCelsius !== null && current.androidDiagnostics?.temperatureCelsius !== undefined
                ? 'available'
                : nextSnapshot.capabilities.temperature,
              voltage: current.androidDiagnostics?.voltageMilliVolts !== null && current.androidDiagnostics?.voltageMilliVolts !== undefined
                ? 'available'
                : nextSnapshot.capabilities.voltage,
              batteryHealth: current.androidDiagnostics?.health
                ? 'available'
                : nextSnapshot.capabilities.batteryHealth,
            },
            source: current.androidDiagnostics !== null ? 'native' : nextSnapshot.source,
          }));
          setHasError(nextSnapshot.source === 'unavailable');
          if (!receivedLiveUpdate) {
            void recordBatterySnapshot(nextSnapshot).catch(() => {
              // Storage failures must not break live battery monitoring.
            });
          }
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startForegroundRefresh = (refreshImmediately: boolean) => {
      if (interval) clearInterval(interval);
      if (refreshImmediately) void refresh();
      interval = setInterval(() => {
        if (AppState.currentState === 'active') void refresh();
      }, 60_000);
    };

    const stopForegroundRefresh = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (AppState.currentState === 'active') startForegroundRefresh(false);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') startForegroundRefresh(true);
      else stopForegroundRefresh();
    });

    return () => {
      stopForegroundRefresh();
      subscription.remove();
    };
  }, [refresh]);

  return { ...snapshot, isLoading, hasError, refresh };
}
