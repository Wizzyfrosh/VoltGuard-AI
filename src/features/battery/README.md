# Battery telemetry feature

## Data flow

`expo-battery.provider.ts` is the current cross-platform adapter. It normalizes OS readings into `BatterySnapshot`. Platform capability declarations live in `battery.capabilities.ts`. Screens should consume `useBatteryTelemetry` and must not call Expo Battery APIs directly.

## Capability policy

- A capability is `available` only when this build successfully reads it.
- A capability is `unavailable` when the platform/runtime does not expose a usable reading.
- A capability is `not-implemented` when the product has not shipped an adapter for it.
- Android-only metrics must not be advertised until a native adapter is implemented and verified on physical devices.
- iOS and web must not inherit Android capability claims.

## Local storage

The SQLite database is local to the device on Android and iOS. Web is explicitly guarded until a browser-specific persistence adapter is added; Expo SQLite web support has additional browser-isolation requirements and must not silently fail at runtime. `battery.repository.ts` exposes parameterized operations for explicit sample writes, bounded reads and retention deletion.

**Important:** creating the database does not start collection. Do not add periodic/background collection until the user has a clear opt-in, retention controls and a privacy explanation. Do not upload samples to a server as part of this local repository.

## Current limitations

- No native Kotlin/Swift adapter exists yet.
- No background sampling or notification workflow exists.
- No battery-session inference exists.
- Temperature, voltage, health, cycle count and per-app power usage remain unimplemented in this build.
