import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as ExpoBattery from 'expo-battery';
import { batteryTelemetryProvider } from './expo-battery.provider';
import type { BatterySnapshot } from './battery.types';
import { recordBatterySnapshot } from './battery.history';
import { mergeBatterySnapshots, shouldPersistBatterySnapshot } from './battery.telemetry';

const emptySnapshot: BatterySnapshot = {
  platform: 'unknown',
  level: null,
  state: ExpoBattery.BatteryState.UNKNOWN,
  lowPowerMode: null,
  observedAt: '',
  diagnosticsObservedAt: null,
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
    batteryTechnology: 'not-implemented',
    batteryCurrent: 'not-implemented',
    remainingCharge: 'not-implemented',
    energyCounter: 'not-implemented',
  },
  androidDiagnostics: null,
};

export function useBatteryTelemetry() {
  const [snapshot, setSnapshot] = useState<BatterySnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const snapshotRef = useRef<BatterySnapshot>(emptySnapshot);
  const lastPersistedRef = useRef<BatterySnapshot | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const eventRevisionRef = useRef(0);

  const publish = useCallback((next: BatterySnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setHasError(next.source === 'unavailable');

    if (shouldPersistBatterySnapshot(lastPersistedRef.current, next)) {
      lastPersistedRef.current = next;
      void recordBatterySnapshot(next).catch(() => {
        // Local history is optional and must never block live telemetry.
      });
    }
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const revisionAtStart = eventRevisionRef.current;
    if (mountedRef.current) setIsLoading(true);

    const request = batteryTelemetryProvider.getSnapshot()
      .then((incoming) => {
        if (!mountedRef.current) return;
        const eventArrivedDuringRequest = eventRevisionRef.current !== revisionAtStart;
        const merged = mergeBatterySnapshots(
          snapshotRef.current,
          incoming,
          eventArrivedDuringRequest,
        );
        publish(merged);
      })
      .catch(() => {
        if (mountedRef.current) setHasError(true);
      })
      .finally(() => {
        if (inFlightRef.current === request) inFlightRef.current = null;
        if (mountedRef.current) setIsLoading(false);
      });

    inFlightRef.current = request;
    return request;
  }, [publish]);

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe = batteryTelemetryProvider.subscribe((incoming) => {
      if (!mountedRef.current) return;
      eventRevisionRef.current += 1;
      const merged = mergeBatterySnapshots(snapshotRef.current, incoming);
      publish(merged);
    });

    void refresh();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [publish, refresh]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const start = (refreshImmediately: boolean) => {
      stop();
      if (refreshImmediately) void refresh();
      interval = setInterval(() => {
        if (AppState.currentState === 'active') void refresh();
      }, 60_000);
    };

    if (AppState.currentState === 'active') start(false);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start(true);
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [refresh]);

  return { ...snapshot, isLoading, hasError, refresh };
}
