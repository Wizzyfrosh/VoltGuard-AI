export async function startBackgroundBatteryMonitoring(_threshold: number): Promise<boolean> { return false; }
export async function stopBackgroundBatteryMonitoring(): Promise<boolean> { return false; }

export type ChargingAlarmStatus = {
  channelId: string;
  notificationsEnabled: boolean;
  channelEnabled: boolean;
  highImportance: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alarmReady: boolean;
};
export function getChargingAlarmStatus(): ChargingAlarmStatus | null { return null; }
export async function sendTestChargingAlarm(): Promise<boolean> { return false; }
