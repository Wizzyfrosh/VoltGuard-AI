# VoltGuard Android battery module

This local Expo module reads Android's public `BatteryManager` properties and the sticky `ACTION_BATTERY_CHANGED` intent.

## Exposed readings

- Battery voltage (mV)
- Battery temperature (tenths of °C, normalized in TypeScript)
- Battery health and charging status
- Plugged power source
- Capacity percentage
- Instantaneous and average current (µA)
- Charge counter (µAh)
- Energy counter (nWh), when supported by the device
- OS-reported battery cycle count on Android 14 (API 34) and later, when exposed by the device

## Important limitations

Android OEMs vary in which values they expose. Unsupported or sentinel values are returned as null and must be displayed as unavailable. Current readings may be signed and fluctuate rapidly. These are OS-reported electrical measurements, not calibrated laboratory measurements.

Cycle count is read from `BatteryManager.EXTRA_CYCLE_COUNT` on Android 14 (API 34) and later. It remains unavailable on older Android versions and on devices that do not expose a valid value. The app never estimates or fabricates a count. Per-app power consumption is not exposed by this module. The module cannot stop charging or control the charging circuit.

A custom development/production build is required. Expo Go does not contain this project-specific native module. Verify readings on physical Android devices from multiple manufacturers before advertising them as generally supported.

## Background charging alerts

The module includes an opt-in Android foreground service. It listens for system battery-change broadcasts and posts a threshold notification while the app UI is backgrounded or the screen is off. The service displays an ongoing notification, stores the threshold in native preferences, uses `START_STICKY` for system process recreation, and attempts to restore an enabled monitor after device reboot or app replacement.

Android 14+ declares the `specialUse` foreground-service type and its subtype explanation. Google Play reviews this use case; disclose it in Play Console and obtain approval before distribution. Users must grant notification permission for normal notification-drawer delivery. Force-stop, user revocation, battery optimization, manufacturer restrictions, and OS policy can still interrupt monitoring. No app can guarantee uninterrupted delivery.

The service does not disable charging. iOS retains foreground-only threshold checks; web is unsupported.
