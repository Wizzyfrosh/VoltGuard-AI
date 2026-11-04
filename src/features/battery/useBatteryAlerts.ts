import { useCallback, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import * as ExpoBattery from 'expo-battery';
import { batteryTelemetryProvider } from './expo-battery.provider';
import { getBatteryPreference, setBatteryPreference } from './battery.database';
import { requestBatteryAlertPermission, sendBatteryThresholdNotification } from './battery.alerts';
import { isValidBatteryAlertThreshold } from './battery.alerts.validation';
import { startBackgroundBatteryMonitoring, stopBackgroundBatteryMonitoring } from '../../../modules/voltguard-battery';

const ENABLED_KEY = 'charging_alert_enabled';
const THRESHOLD_KEY = 'charging_alert_threshold';
const DEFAULT_THRESHOLD = 80;
const ALERT_PREFERENCES_CHANGED = 'voltguard:charging-alert-preferences-changed';

export function useBatteryAlerts(monitor = true) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isAvailable] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    void Promise.all([getBatteryPreference(ENABLED_KEY), getBatteryPreference(THRESHOLD_KEY)])
      .then(([savedEnabled, savedThreshold]) => {
        if (!mounted) return;
        const parsed = Number(savedThreshold);
        setEnabled(savedEnabled === 'true');
        setThreshold(Number.isInteger(parsed) && parsed >= 50 && parsed <= 100 ? parsed : DEFAULT_THRESHOLD);
      })
      .catch(() => { if (mounted) setPermissionDenied(true); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(ALERT_PREFERENCES_CHANGED, (change: { enabled?: boolean; threshold?: number }) => {
      if (typeof change.enabled === 'boolean') setEnabled(change.enabled);
      if (typeof change.threshold === 'number' && isValidBatteryAlertThreshold(change.threshold)) setThreshold(change.threshold);
    });
    return () => subscription.remove();
  }, []);

  const updateEnabled = useCallback(async (nextEnabled: boolean) => {
    if (nextEnabled) {
      try {
        const granted = await requestBatteryAlertPermission();
        if (!granted) { setPermissionDenied(true); return false; }
        setPermissionDenied(false);
      } catch { setPermissionDenied(true); return false; }
    }
    try {
      await setBatteryPreference(ENABLED_KEY, String(nextEnabled));
      if (Platform.OS === 'android') {
        if (nextEnabled) await startBackgroundBatteryMonitoring(threshold);
        else await stopBackgroundBatteryMonitoring();
      }
      setEnabled(nextEnabled);
      DeviceEventEmitter.emit(ALERT_PREFERENCES_CHANGED, { enabled: nextEnabled });
      return true;
    } catch { return false; }
  }, [threshold]);

  const updateThreshold = useCallback(async (nextThreshold: number) => {
    if (!isValidBatteryAlertThreshold(nextThreshold)) return false;
    try {
      await setBatteryPreference(THRESHOLD_KEY, String(nextThreshold));
      if (Platform.OS === 'android' && enabled) await startBackgroundBatteryMonitoring(nextThreshold);
      setThreshold(nextThreshold);
      DeviceEventEmitter.emit(ALERT_PREFERENCES_CHANGED, { threshold: nextThreshold });
      return true;
    } catch { return false; }
  }, [enabled]);

  useEffect(() => {
    if (monitor && Platform.OS === 'android' && !isLoading) {
      if (enabled) void startBackgroundBatteryMonitoring(threshold).catch(() => undefined);
      else void stopBackgroundBatteryMonitoring().catch(() => undefined);
    }
  }, [monitor, enabled, threshold, isLoading]);

  useEffect(() => {
    if (!monitor || Platform.OS === 'android' || !enabled || !isAvailable) return;
    let wasCharging = false;
    let notifiedThisSession = false;
    let active = AppState.currentState === 'active';

    const evaluate = (snapshot: Awaited<ReturnType<typeof batteryTelemetryProvider.getSnapshot>>) => {
      if (!active) return;
      const level = snapshot.level;
      const charging = snapshot.state === ExpoBattery.BatteryState.CHARGING
        || snapshot.state === ExpoBattery.BatteryState.FULL
        || snapshot.androidDiagnostics?.status === 'charging'
        || (snapshot.androidDiagnostics?.status === 'full' && snapshot.androidDiagnostics.plugged !== 'none-or-unknown');
      if (!charging) notifiedThisSession = false;
      if (charging && !wasCharging) notifiedThisSession = false;
      if (charging && level !== null && level * 100 >= threshold && !notifiedThisSession) {
        notifiedThisSession = true;
        void sendBatteryThresholdNotification(level * 100, threshold).catch(() => undefined);
      }
      wasCharging = charging;
    };

    void batteryTelemetryProvider.getSnapshot().then(evaluate).catch(() => undefined);
    const unsubscribe = batteryTelemetryProvider.subscribe(evaluate);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) void batteryTelemetryProvider.getSnapshot().then(evaluate).catch(() => undefined);
    });
    return () => { unsubscribe(); appStateSubscription.remove(); };
  }, [enabled, threshold, isAvailable, monitor]);

  return { enabled, threshold, isLoading, permissionDenied, isAvailable, updateEnabled, updateThreshold };
}
