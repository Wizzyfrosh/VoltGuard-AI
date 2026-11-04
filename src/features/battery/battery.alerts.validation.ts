export function isValidBatteryAlertThreshold(value: number): boolean {
  return Number.isInteger(value) && value >= 50 && value <= 100;
}
