import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isNotificationPermissionGranted } from './notification-permissions';
import { getChargingAlarmStatus, sendTestChargingAlarm } from '../../../modules/voltguard-battery';



export async function requestBatteryAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    return permission === 'granted';
  }
  if (Platform.OS === 'android') {
    // Native code owns the channel configuration for alarm sound and importance.
    getChargingAlarmStatus();
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = isNotificationPermissionGranted(current)
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!isNotificationPermissionGranted(permission)) return false;
  if (Platform.OS === 'android') {
    const status = getChargingAlarmStatus();
    if (!status?.alarmReady) {
      throw new Error(
        !status?.notificationsEnabled
          ? 'VoltGuard notifications are disabled in Android Settings.'
          : !status?.channelEnabled
            ? 'Enable the Charging target alarm notification channel in Android Settings.'
            : !status?.highImportance
              ? 'Set Charging target alarm importance to High in Android Settings.'
              : !status?.soundEnabled
                ? 'Charging target alarm is silent. Choose an alarm sound in Android Settings.'
                : 'Charging target alarm is not ready. Check Android notification settings.'
      );
    }
  }
  return true;
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

export async function sendChargingAlarmTest(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return sendTestChargingAlarm();
}

export function getChargingAlarmReadiness() {
  if (Platform.OS !== 'android') return null;
  return getChargingAlarmStatus();
}
