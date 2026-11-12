/** A single strict parser for the persisted opt-in value. Unknown values fail closed. */
export function hasBatteryHistoryConsent(value: string | null | undefined): boolean {
  return value === 'true';
}
