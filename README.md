# VoltGuard AI

VoltGuard AI is a cross-platform battery monitoring and insights app built with Expo. Battery readings are collected through Expo Battery, with optional Android-specific diagnostics from a local native module.

## Battery data support

- Android: battery level and charging state, plus device-dependent voltage, temperature, health, current, charge/energy counters and OS-reported cycle count.
- Android cycle count: available only on Android 14 (API 34) and later, and only when the device exposes a valid value through `ACTION_BATTERY_CHANGED`. Unsupported values are shown as unavailable; the app does not estimate a cycle count.
- iOS and web: only metrics exposed by their platform APIs. Android-only diagnostics are not advertised as supported there.

## Charging alerts

On Android, users can opt in to a native foreground service that listens for system battery-change broadcasts while the app is backgrounded or the screen is off. It displays an ongoing notification, stores the selected threshold natively, and restores monitoring after device reboot or app replacement where Android permits it. Android can still stop/defer services due to force-stop, OEM power management, notification restrictions, or system policy. Android 14+ uses the `specialUse` foreground-service type; Google Play reviews this declared use case, so Play Console disclosure and approval are required before release.

On iOS, threshold checks run only while VoltGuard is open; iOS does not provide an equivalent general-purpose continuous battery-level background monitor. Web does not support this feature.

Threshold notifications are reminders only: VoltGuard cannot stop, pause, or limit charging. Users must disconnect the charger themselves.

## Development

```bash
npm install
npm run start
```

The Android diagnostics module requires a custom Expo development or production build; it is not included in Expo Go. Run `npm test`, `npm run typecheck`, and `npm run lint` before release, then validate native readings and notifications on physical Android devices. OEM and hardware support varies.
