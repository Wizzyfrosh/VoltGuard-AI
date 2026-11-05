import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    let active = true;
    void getBatteryPreference(PREFERENCE_KEY)
      .then((value) => {
        if (!active) return;
        const saved = parseSettings(value);
        setEnabled(saved.enabled);
        setTime(saved.time);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load reminder settings.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const update = useCallback(async (nextEnabled: boolean, nextTime = time) => {
    if (Platform.OS === 'web') {
      setError('Scheduled reminders while the browser is closed are not supported on web. Use the Android or iOS app.');
      return false;
    }
    setError(null);
    try {
      const stored = parseSettings(await getBatteryPreference(PREFERENCE_KEY));
      // Schedule the replacement before cancelling the existing reminder. If
      // scheduling fails, the user's previous reminder remains active.
      const notificationId = nextEnabled ? await scheduleReminder(nextTime) : null;
      try {
        await setBatteryPreference(PREFERENCE_KEY, JSON.stringify({
          enabled: nextEnabled,
          time: nextTime,
          notificationId,
        }));
      } catch (persistError) {
        if (notificationId) {
          await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
        }
        throw persistError;
      }
      if (stored.notificationId && stored.notificationId !== notificationId) {
        await Notifications.cancelScheduledNotificationAsync(stored.notificationId).catch(() => undefined);
      }
      setEnabled(nextEnabled);
      setTime(nextTime);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the battery-care reminder.');
      return false;
    }
  }, [time]);

  const updateTime = useCallback(async (nextTime: string) => {
    if (!AVAILABLE_TIMES.includes(nextTime as typeof AVAILABLE_TIMES[number])) return false;
    if (!enabled) {
      setTime(nextTime);
      try {
        const stored = parseSettings(await getBatteryPreference(PREFERENCE_KEY));
        await setBatteryPreference(PREFERENCE_KEY, JSON.stringify({ ...stored, time: nextTime }));
        return true;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not save reminder time.');
        return false;
      }
    }
    return update(true, nextTime);
  }, [enabled, update]);

  return { enabled, time, isLoading, error, updateEnabled: (value: boolean) => update(value), updateTime };
}
