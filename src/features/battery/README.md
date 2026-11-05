# Battery telemetry feature

## Data flow

`expo-battery.provider.ts` is the cross-platform adapter. It normalizes OS readings into `BatterySnapshot`. Platform capability declarations live in `battery.capabilities.ts`. Screens should consume `useBatteryTelemetry` and must not call Expo Battery APIs directly.

## Capability policy

- A capability is `available` only when this build successfully reads it.
- A capability is `unavailable` when the platform/runtime does not expose a usable reading.
- A capability is `not-implemented` when the product has not shipped an adapter for it.
- Android-only metrics must not be advertised until a native adapter is present; physical-device verification is still required before production claims.
- iOS and web must not inherit Android capability claims.
- Missing, sentinel, invalid or unsupported native values must remain null; do not replace them with estimates or sample values.

## Local storage and collection

- Android and iOS battery history uses local SQLite (`voltguard.db`).
- On web, user preferences use browser `localStorage`, but battery history/session persistence is explicitly unavailable: `getBatteryDatabase()` rejects on web. Preference persistence must not be confused with history support.
- No telemetry is uploaded to a server.
- Creating the database does not start persistence. History writes occur only after the user explicitly enables history.
- Live diagnostics refresh while the app is foregrounded (on resume and every 60 seconds). This is foreground refresh, not a background sampling guarantee.
- Charging sessions are inferred from observed charging-state transitions. Sessions can be incomplete when the app is not running or samples are missing.
- Retention is bounded to 30 days by the history layer.

## Current limitations

- Android native diagnostics require a custom native build; they are not available in Expo Go or the web preview.
- Native diagnostics are implemented but have not been verified across a physical-device matrix.
- No native iOS adapter for Android-specific hardware diagnostics exists.
- No general-purpose background telemetry sampling is registered.
- Android charging-target monitoring uses a native foreground service, subject to Android/OEM restrictions documented in the repository root README.
- Per-app energy consumption is not implemented. Ordinary third-party apps do not have unrestricted access to precise per-app BatteryStats/mAh.
- Cycle count is conditionally read on Android 14+ (API 34+) from `BatteryManager.EXTRA_CYCLE_COUNT` when the sticky battery intent returns a valid non-negative value. This is device-dependent; unsupported values remain null. It is not estimated.
