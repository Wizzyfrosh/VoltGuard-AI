# Expo SDK 58 migration — controlled execution plan

## Scope and safety boundary

This migration is isolated to `maintenance/expo-sdk58-migration`, based on the Phase E production-hardening branch. It must not modify `main`, merge existing feature PRs, or overwrite their branches.

The workflow is a **candidate-generation and validation exercise**. It installs the existing lockfile, records a baseline, then upgrades one SDK at a time (SDK 56 is intentionally skipped because Expo documents a Hermes V1 memory regression affecting Reanimated and Worklets users) through SDK 55, directly to SDK 57.0.17 or later, and then SDK 58. Each stage must pass the same app, web, and Android native-module checks before the next SDK is attempted.

Official guidance:
- Upgrade SDKs incrementally and run `npx expo install --fix` and `npx expo-doctor`: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- Review each SDK's release notes and migration notes before accepting the generated dependency set: https://expo.dev/changelog

## Gates at each stage

1. Install dependencies from the current lockfile with `npm ci`.
2. Capture baseline package versions and production audit report.
3. Run TypeScript, unit tests, lint, and static web export.
4. Regenerate Android with Expo Prebuild and compile the custom Kotlin module.
5. Upgrade to the next SDK using Expo's installer.
6. Run Expo Doctor, TypeScript, unit tests, lint, web export, and Android native compilation.
7. Capture package versions, audit report, package.json, and package-lock.json as stage artifacts.
8. Stop immediately at the first failing stage. Diagnose it before continuing; later SDK upgrades must not hide earlier regressions.

## SDK 55 compatibility adjustments

- Remove the deprecated, unused `expo-av` dependency; no source imports were found in the repository search.
- Remove the direct `expo-modules-core` dependency. Expo supplies its compatible version; the local native module is linked through Expo autolinking.
- Remove `newArchEnabled`: React Native 0.83 (SDK 55) always uses the New Architecture, and this config option no longer exists.
- Remove the obsolete `android.edgeToEdgeEnabled` field from the SDK 55 config; edge-to-edge behavior must be verified against SDK 55's Android target and safe-area layout rather than controlled by this removed config field.
- Exclude the private local `voltguard-battery` package from React Native Directory metadata checks; this is a local module, not an unknown third-party dependency.

## SDK 55 TypeScript compatibility adjustments

- Native-module JavaScript entry points import `requireNativeModule` and `requireOptionalNativeModule` from the SDK's `expo` package, avoiding an application-level direct dependency on `expo-modules-core`.
- The local module declares `expo` as its peer dependency and `expo-modules-core` as an SDK-matched development dependency. The root app keeps the same core package dev-only for TypeScript resolution; it is excluded from Expo's package-version check because Expo itself supplies the runtime-compatible copy.
- Notification permission checks use a narrow runtime-safe adapter for SDK 55's incomplete inherited TypeScript declarations. The adapter accepts the documented granted status and iOS provisional authorization without assuming fields exist on malformed responses.

## SDK 55 architectural migration gate

SDK 55 removes the legacy architecture option. The custom `voltguard-battery` module is built with the Expo Modules API, which supports the New Architecture, but that fact alone is not sufficient acceptance. The generated Android project must compile, and the physical-device test must verify service startup, battery broadcasts, notification actions, and native-to-JS event delivery on a SDK 55 build.

## VoltGuard-specific regression focus

- `VoltGuardBatteryModule` Expo Modules API compatibility.
- Foreground battery monitor service and notification channel behavior.
- Charging threshold detection and background receiver registration.
- Android manifest permissions and foreground-service declarations.
- SQLite history persistence and retention.
- Reanimated/Worklets runtime and memory behavior.
- Expo Router navigation and typed routes.
- Web export and web-safe native-module fallbacks.

## Release/merge policy

No SDK candidate is mergeable solely because CI passes. Before merging, review generated manifests, lockfile diff, audit deltas, Expo Doctor output, native build logs, and each SDK's changelog migration notes. Then install the candidate on a physical Android device and verify battery readings, charging alerts, foreground notification, background monitoring, history persistence, app relaunch, and upgrade installation.

The dependency audit is captured as evidence, not made a hard gate during candidate generation. Security remediation must not introduce incompatible forced overrides. Final acceptance requires a reviewed vulnerability disposition and no unexplained regression.

## Current status

- [x] Isolated migration branch created from Phase E.
- [x] Baseline CI state inspected.
- [x] Staged migration workflow committed.
- [ ] Baseline and SDK 55 candidate validated.
- [ ] SDK 57.0.17+ candidate validated.
- [ ] SDK 58 candidate validated.
- [ ] Physical-device regression testing completed.
- [ ] Final manifests and lockfile reviewed.
- [ ] Migration PR approved and merged.
