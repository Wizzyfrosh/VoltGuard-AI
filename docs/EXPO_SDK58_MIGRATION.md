# Expo SDK 58 migration — controlled execution plan

## Scope and safety boundary

This migration is isolated to `maintenance/expo-sdk58-migration`, based on the Phase E production-hardening branch. It must not modify `main`, merge existing feature PRs, or overwrite their branches.

The first run is a **candidate-generation and validation exercise**. CI installs the existing lockfile, records a baseline, then upgrades the working tree through SDK 55, SDK 57, and SDK 58. SDK 56 is intentionally skipped because Expo's current upgrade skill documents a Hermes V1 memory regression affecting SDK 55 with Hermes V1 enabled, SDK 56, and early SDK 57; VoltGuard uses both Reanimated and Worklets. The selected SDK 57 release must therefore be the fixed release resolved by the current stable SDK 57 range, not an early patch.

Official guidance:
- Upgrade SDKs incrementally and run `npx expo install --fix` and `npx expo-doctor`: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- SDK 57 release notes and Hermes regression fix: https://expo.dev/changelog/sdk-57
- SDK 58 upgrade notes: https://expo.dev/blog/how-to-upgrade-to-sdk-58

## Gates at each stage

1. Install dependencies from the current lockfile with `npm ci`.
2. Capture the baseline package versions and production audit report.
3. Run TypeScript, unit tests, lint, and static web export.
4. Regenerate Android with Expo Prebuild and compile the custom Kotlin module.
5. Upgrade to the next approved SDK target using Expo's installer.
6. Run Expo Doctor, TypeScript, unit tests, lint, web export, and Android native compilation again.
7. Capture package versions and a production audit report for that stage.
8. Preserve package manifests and lockfiles as CI artifacts for review.

The workflow stops at the first failing stage. It does not auto-commit or auto-merge generated changes. A failed stage must be diagnosed before proceeding; later SDK upgrades must not hide earlier regressions.

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

No SDK candidate is mergeable solely because CI passes. Before merging, review the generated manifests, lockfile diff, audit deltas, Expo Doctor output, native build logs, and all SDK changelog migration notes. Then install the candidate on a physical Android device and verify battery readings, charging alerts, foreground notification, background monitoring, history persistence, app relaunch, and upgrade installation.

The dependency audit is captured as evidence, not made a hard gate during candidate generation. Security remediation must not introduce incompatible forced overrides. Final acceptance requires a reviewed vulnerability disposition and no unexplained regression.

## Current status

- [x] Isolated migration branch created from Phase E.
- [x] Baseline CI state inspected.
- [x] Staged migration workflow added.
- [ ] Baseline and SDK 55 candidate validated.
- [ ] SDK 57 candidate validated.
- [ ] SDK 58 candidate validated.
- [ ] Physical-device regression testing completed.
- [ ] Final manifests and lockfile reviewed.
- [ ] Migration PR approved and merged.
