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

**Important:** creating the database does not start persistence. Battery diagnostics refresh while the app is foregrounded (on resume and every 60 seconds) for the live dashboard; samples are written to SQLite only after explicit history opt-in. No background task is registered and no telemetry is uploaded to a server.

## Current limitations

- Android native diagnostics are implemented but require a custom native build and physical-device verification.
- No native iOS diagnostics adapter exists.
- No background sampling or notification workflow exists.
- Charging sessions are inferred from observed foreground charging-state changes and may be incomplete.
- Cycle count and per-app power usage remain unimplemented.

## Android native diagnostics

The local Expo module at `modules/voltguard-battery` reads Android BatteryManager properties and the sticky battery-changed intent. It can expose temperature (tenths of °C converted to °C), voltage (mV), health/status/plugged state, capacity, instantaneous and average current, charge counter, and energy counter when the device reports them. Unsupported values remain null and capabilities are marked unavailable. Cycle count is intentionally null because it is not consistently exposed across Android versions/devices. These diagnostics require a native Android development/production build; they are not available in Expo Go or the web preview. Physical-device verification is required before production claims.
