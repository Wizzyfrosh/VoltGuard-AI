import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Expo SDK 55's NotificationPermissionsStatus declarations can omit the
 * inherited PermissionResponse fields even though the runtime response
 * includes them. Keep the compatibility check narrow and runtime-safe.
 */
type PermissionResponseShape = {
  granted?: unknown;
  status?: unknown;
  ios?: { status?: unknown };
};

export function isNotificationPermissionGranted(permission: unknown): boolean {
  if (!permission || typeof permission !== 'object') return false;
  const response = permission as PermissionResponseShape;
  return response.granted === true
    || response.status === 'granted'
    || (Platform.OS === 'ios'
      && response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);
}
