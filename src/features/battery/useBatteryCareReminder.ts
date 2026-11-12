import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getBatteryPreference, setBatteryPreference } from './battery.database';

const PREFERENCE_KEY = 'battery_care_reminder_v1';
const CHANNEL_ID = 'battery-care-reminders';
const DEFAULT_TIME = '20:00';
const AVAILABLE_TIMES = ['07:00', '12:00', '20:00'] as const;

type ReminderSettings = { enabled: boolean; time: string; notificationId: string | null };

function parseSettings(value: string | null): ReminderSettings {
  if (!value) return { enabled: false, time: DEFAULT_TIME, notificationId: null };
  try {
    const parsed = JSON.parse(value) as Partial<ReminderSettings>;
    const time = typeof parsed.time === 'string' && AVAILABLE_TIMES.includes(parsed.time as typeof AVAILABLE_TIMES[number])
      ? parsed.time
      : DEFAULT_TIME;
    return {
      enabled: parsed.enabled === true,
      time,
      notificationId: typeof parsed.notificationId === 'string' ? parsed.notificationId : null,
    };
  } catch {
    return { enabled: false, time: DEFAULT_TIME, notificationId: null };
  }
}

async function ensureNotificationPermission(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notification permission is required for battery-care reminders.');
}

async function scheduleReminder(time: string): Promise<string> {
  await ensureNotificationPermission();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Battery care reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
    });
  }
  const [hour, minute] = time.split(':').map(Number);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Battery care check-in',
      body: 'Take a moment to check your battery temperature, charging habits and recent battery activity.',
      sound: 'default',
      data: { type: 'battery-care-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export function useBatteryCareReminder() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());

  const enqueueMutation = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationQueue.current.then(operation, operation);
    mutationQueue.current = result.then(() => undefined, () => undefined);
    return result;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void getBatteryPreference(PREFERENCE_KEY)
      .then((value) => {
        if (!mountedRef.current) return;
        const saved = parseSettings(value);
        setEnabled(saved.enabled);
        setTime(saved.time);
      })
      .catch((reason) => {
        if (mountedRef.current) setError(reason instanceof Error ? reason.message : 'Could not load reminder settings.');
      })
      .finally(() => { if (mountedRef.current) setIsLoading(false); });
    return () => { mountedRef.current = false; };
  }, []);

  const updateEnabled = useCallback((nextEnabled: boolean) => enqueueMutation(async () => {
    if (Platform.OS === 'web') {
      if (mountedRef.current) setError('Scheduled reminders while the browser is closed are not supported on web. Use the Android or iOS app.');
      return false;
    }
    if (mountedRef.current) setError(null);
    try {
      const stored = parseSettings(await getBatteryPreference(PREFERENCE_KEY));
      const scheduledId = nextEnabled ? await scheduleReminder(stored.time) : null;
      // Create the replacement first. If scheduling or persistence fails, the
      // currently active reminder remains intact.
      try {
        await setBatteryPreference(PREFERENCE_KEY, JSON.stringify({
          enabled: nextEnabled,
          time: stored.time,
          notificationId: scheduledId,
        }));
      } catch (persistError) {
        if (scheduledId) {
          await Notifications.cancelScheduledNotificationAsync(scheduledId).catch(() => undefined);
        }
        throw persistError;
      }
      if (stored.notificationId && stored.notificationId !== scheduledId) {
        await Notifications.cancelScheduledNotificationAsync(stored.notificationId).catch(() => undefined);
      }
      if (mountedRef.current) {
        setEnabled(nextEnabled);
        setTime(stored.time);
      }
      return true;
    } catch (reason) {
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : 'Could not update the battery-care reminder.');
      return false;
    }
  }), [enqueueMutation]);

  const updateTime = useCallback((nextTime: string) => enqueueMutation(async () => {
    if (!AVAILABLE_TIMES.includes(nextTime as typeof AVAILABLE_TIMES[number])) return false;
    if (Platform.OS === 'web') {
      if (mountedRef.current) setError('Scheduled reminders while the browser is closed are not supported on web. Use the Android or iOS app.');
      return false;
    }
    if (mountedRef.current) setError(null);
    let replacementId: string | null = null;
    try {
      const stored = parseSettings(await getBatteryPreference(PREFERENCE_KEY));
      if (stored.enabled) replacementId = await scheduleReminder(nextTime);
      try {
        await setBatteryPreference(PREFERENCE_KEY, JSON.stringify({
          enabled: stored.enabled,
          time: nextTime,
          notificationId: stored.enabled ? replacementId : stored.notificationId,
        }));
      } catch (persistError) {
        if (replacementId) {
          await Notifications.cancelScheduledNotificationAsync(replacementId).catch(() => undefined);
        }
        throw persistError;
      }
      if (stored.enabled && stored.notificationId && stored.notificationId !== replacementId) {
        await Notifications.cancelScheduledNotificationAsync(stored.notificationId).catch(() => undefined);
      }
      if (mountedRef.current) {
        setTime(nextTime);
        setEnabled(stored.enabled);
      }
      return true;
    } catch (reason) {
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : 'Could not update the reminder time.');
      return false;
    }
  }), [enqueueMutation]);

  return { enabled, time, isLoading, error, updateEnabled, updateTime };
}
