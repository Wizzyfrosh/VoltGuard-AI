import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'battery-threshold-alerts';

export async function requestBatteryAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Battery charging target reached',
      body: `Your battery is at ${Math.round(level)}%. Your alert target is ${threshold}%. Unplug your charger if convenient. VoltGuard cannot stop charging automatically.`,
      sound: 'default',
      data: { type: 'battery-threshold', level: Math.round(level), threshold },
    },
    trigger: null,
  });
}
