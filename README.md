# VoltGuard AI

VoltGuard AI is a cross-platform battery monitoring and insights app built with Expo. Battery readings are collected through Expo Battery, with optional Android-specific diagnostics from a local native module.

## Battery data support

- Android: battery level and charging state, plus device-dependent voltage, temperature, health, current, charge/energy counters and OS-reported cycle count.
- Android cycle count: available only on Android 14 (API 34) and later, and only when the device exposes a valid value through `ACTION_BATTERY_CHANGED`. Unsupported values are shown as unavailable; the app does not estimate a cycle count.
- iOS and web: only metrics exposed by their platform APIs. Android-only diagnostics are not advertised as supported there.

## Charging alerts

Users can opt in to a local notification at a selected charging percentage. Threshold checks are evaluated while VoltGuard is open/in the foreground. Background delivery is not guaranteed. The notification is a reminder only: VoltGuard cannot stop, pause, or limit charging. Users must disconnect the charger themselves.

## Development

```bash
npm install
npm run start
```

The Android diagnostics module requires a custom Expo development or production build; it is not included in Expo Go. Run `npm test`, `npm run typecheck`, and `npm run lint` before release, then validate native readings and notifications on physical Android devices. OEM and hardware support varies.
