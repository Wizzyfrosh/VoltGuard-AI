import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'battery-threshold-alerts';

export async function requestBatteryAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    return permission === 'granted';
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Battery threshold alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function sendBatteryThresholdNotification(level: number, threshold: number): Promise<void> {
  const title = 'Battery charging target reached';
  const body = `Your battery is at ${Math.round(level)}%. Your alert target is ${threshold}%. Unplug your charger if convenient. VoltGuard cannot stop charging automatically.`;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Browser notifications are not permitted.');
    }
    new Notification(title, { body, tag: 'voltguard-battery-threshold' });
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { type: 'battery-threshold', level: Math.round(level), threshold },
    },
    trigger: null,
  });
}
