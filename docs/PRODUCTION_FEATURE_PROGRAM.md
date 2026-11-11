# VoltGuard AI — Production Feature Program

> Living implementation tracker. Update this file in the same PR/commit as every feature milestone. A new AI session should read this document first, inspect the current branch/PR and tests, then continue from the first unchecked item. Do not assume a checkbox is complete without code and validation evidence.

**Program branch:** `roadmap/production-feature-program`  
**Baseline:** `phase-6/web-testing` at `17024adcf921352c887b416c3cc0ed0bbc07ee0d`  
**Product rule:** preserve the existing application, routes, navigation and working functionality. Extend existing screens and add focused detail screens/sections; do not add another bottom tab.  
**Data rule:** production data only. Never seed fake telemetry, fabricated app rankings, synthetic device values, placeholder optimization scores, or pretend background jobs. Unsupported values must be explicitly shown as unavailable/not supported. Estimates must be labelled and explain their inputs.

## 1. Product and design direction

Use the user-provided Android hardware-monitor screenshot as visual inspiration, not as a replacement design. Retain VoltGuard's current identity and existing app structure. Extend it with:
- Compact, high-information hardware cards and clear section hierarchy.
- Live/connected/disconnected status indicators with timestamps and stale-data states.
- Metric grids for battery, charging, device, memory and storage where real APIs provide values.
- Green as a restrained positive/status accent; preserve current theme tokens and accessible contrast.
- Responsive layouts that work on narrow Android screens and web.
- Professional Lucide icons; no emoji UI.
- No new bottom navigation tab. Add features within existing Home, Analytics, History, Profiles and Settings flows, using nested screens or expandable sections when necessary.

## 2. Platform truth and hard constraints

| Capability | Production rule |
|---|---|
| Battery level, charging state | Read from platform APIs; show unavailable on failure. |
| Battery voltage, temperature, health/status, plugged source, current, charge counter, energy counter | Android BatteryManager values are device-dependent. Preserve units and nulls; verify on physical devices before claiming support. |
| Battery technology / design capacity / full-charge capacity | Android public APIs do not consistently expose these. Show only if a supported device/API supplies a real value; do not infer chemistry or design capacity from model name. |
| Cycle count | Current native code reads `EXTRA_CYCLE_COUNT` on Android 14+ when the sticky battery intent returns a valid non-negative value. It remains unavailable on devices/OS versions that do not expose it. |
| OS-reported battery health vs estimated health | Keep separate. OS health status (GOOD/OVERHEAT/DEAD/etc.) is not a battery capacity/wear percentage. Any wear estimate requires valid design/full-charge capacity and must be labelled estimate. |
| Per-app battery mAh | Android's detailed BatteryStats access is privileged/restricted. Ordinary apps cannot promise precise per-app mAh. Investigate supported UsageStats/user-granted access, but distinguish app foreground time from actual energy consumption. Do not fabricate mAh or ranking. |
| Screen-on/off and deep sleep | Requires reliable time-series/OS counters. App foreground samples alone cannot infer CPU deep sleep. Show only actual supported counters; otherwise unavailable. |
| GPS, Bluetooth, NFC, sync, brightness toggles | Third-party apps cannot freely toggle several protected system settings on modern Android. Provide detection where permission/API permits and deep links/instructions to Settings; never silently change protected settings. |
| Force-stop/clean/kill other apps | Do not implement fake “RAM cleaner” or force-stop functionality. Android manages process memory. Provide measured memory/storage information and user-directed app settings only. |
| Charging speed optimization | VoltGuard cannot raise charger output or change hardware charge policy. It can measure current/voltage where exposed and provide evidence-based suggestions. |
| Stop charging automatically | Not available through ordinary public Android APIs. Threshold alerts are reminders; user disconnects charger. |
| Audible target alarm | Use a dedicated high-importance notification channel with sound/vibration and clear permission/channel diagnostics. Android/OEM/DND/volume settings can suppress sound. Do not promise an alarm that overrides system controls or runs indefinitely. |
| Background operation | Android foreground service can monitor within OS policy. Force-stop, OEM restrictions, denied notifications, service policy and battery optimization may stop/defer it. iOS background monitoring is restricted. Web monitoring is page-lifetime only. |
| Web | Do not imply web can read Android-only telemetry, run Android services, or schedule reliable closed-tab monitoring. |

## 3. Feature inventory and status at baseline

Statuses reflect source inspection, not physical-device verification.

- [x] Existing five-tab navigation retained: Home, Analytics, Profiles, History, Settings.
- [x] Cross-platform telemetry provider and capability model exist.
- [x] Android BatteryManager adapter exists for device-dependent diagnostics.
- [x] Native cycle-count read is implemented conditionally for Android 14+; actual availability remains device-dependent.
- [x] Charging threshold preferences/alerts and Android foreground monitoring service exist in code.
- [x] Local opt-in history and charging-session inference exist in code (30-day retention).
- [x] Browser testing path exists on phase-6 branch; browser Battery Status API is optional and limited.
- [x] Analytics breakdown explicitly removed prototype/sample app-consumption values; current UI correctly explains that per-app power data is not accessible.
- [ ] Physical Android verification of native diagnostics, threshold alert sound, screen-off operation, reboot recovery, and OEM behaviour.
- [ ] Web history persistence: verify current browser database adapter end-to-end; feature README still describes web history as unsupported, so documentation and implementation must be reconciled.
- [ ] Production Vercel preview verification for the current web branch.
- [ ] Resolve/verify prior native splash/startup issue on physical device.
- [ ] Update stale `src/features/battery/README.md`: it says cycle count is intentionally null, while native code now attempts Android 14+ `EXTRA_CYCLE_COUNT`; it also describes the old web storage limitation.
- [ ] Dependency/security audit and remediation with current lockfile and CI evidence.
- [ ] No dedicated daily battery-care reminder exists.
- [ ] No evidence-backed battery drain analysis engine exists.
- [ ] No robust battery health explanation separating OS health from capacity/wear estimates exists.
- [ ] Per-app energy consumption is not implemented; current capability is not-implemented.
- [ ] No verified screen-off/deep-sleep breakdown exists.
- [ ] No full charging detection/optimization hub exists.
- [ ] No real app candidate/protected-app sleep management exists.
- [ ] No defensible boost score or cleaner exists; do not invent one.
- [ ] No complete device information page covering only supported fields exists.
- [ ] No report export workflow exists.
- [ ] No weekly/monthly battery wear/efficiency reporting is established from validated samples.

## 4. Workstreams and acceptance criteria

### A. Stabilization and platform capability foundation
- [ ] Reconcile docs, implementation and capability flags (especially cycle count and web history).
- [ ] Add capability provenance: platform, API/source, observed timestamp, supported/unavailable/not-implemented.
- [ ] Add stale-data/error states; a failed refresh must not silently display stale readings as live.
- [ ] Validate Android native module on physical devices and record device model, Android version, supported fields and test outcome without collecting personal identifiers.
- [ ] Verify splash/startup, permissions, service lifecycle, reboot and force-stop limitations.
- [ ] Audit dependency vulnerabilities and update lockfile safely.
- Acceptance: CI typecheck/tests/lint/web export/native compile pass; physical Android test report is recorded; no unsupported capability is advertised.

### B. Device and battery information
- [ ] Build a Device & Battery details section using the existing navigation.
- [ ] Display only verified values: battery level, state, voltage (mV), temperature (°C), health status, charging source, current (with correct sign/unit), charge counter/capacity/energy if available, API/platform and timestamp.
- [ ] Show battery technology and design/full-charge capacity only when a real platform source supplies them.
- [ ] Explain each unsupported field and distinguish unavailable from not implemented.
- Acceptance: no hard-coded device specs; unit tests cover null/sentinel/range handling; physical-device readings match Android diagnostics.

### C. Charging Detect & Optimization Hub
- [ ] Add live charging connection state and animated indicator driven by actual charging state (not decorative fake animation).
- [ ] Display voltage, instantaneous/average current and source with explicit units and timestamp; handle signed current correctly.
- [ ] Add detection cards for brightness, location/GPS, sync, Bluetooth and NFC only where APIs/permissions permit.
- [ ] For restricted toggles, provide a Settings deep link or clear manual instruction; never claim the app toggled it.
- [ ] Give measured, conservative charging suggestions. Do not promise faster charging or disable services automatically.
- [ ] Add dedicated target-alert channel with sound/vibration and a user-configurable sound/alert test if supported.
- [ ] Diagnose notification permission, channel disabled, DND/volume restrictions and background-service status.
- Acceptance: threshold crossing produces one audible notification per charging cycle where OS permits; re-arm on unplug; no duplicate alarms; no automatic charge-stop claim.

### D. Battery drain and usage analytics
- [ ] Build drain-rate analysis from persisted, timestamped battery samples, using elapsed time and percentage deltas.
- [ ] Filter noisy/invalid intervals, charging intervals, device restarts and sparse samples.
- [ ] Explain possible causes as hypotheses, not certainty (screen-on time, signal conditions if available, high temperature, recent app usage if permission granted).
- [ ] Separate foreground/app usage time from actual per-app energy.
- [ ] Investigate Android UsageStats access as an optional, explicit user-granted capability; document that it is not mAh measurement.
- [ ] Investigate platform support for per-app BatteryStats; do not request privileged permissions unavailable to ordinary Play Store apps.
- [ ] Screen-on/off/deep-sleep breakdown only when reliable OS counters or validated background sampling exist.
- Acceptance: analytics are computed only from real persisted observations; every estimate shows formula/window/confidence and never fills gaps with demo values.

### E. Battery health assessment and best practices
- [ ] Separate OS-reported health status from capacity/wear estimate.
- [ ] If design capacity and full-charge capacity are available, compute labelled estimate: health ratio = full-charge capacity / design capacity; guard invalid/unknown values.
- [ ] If required inputs are absent, show status-only explanation and say why wear percentage cannot be calculated.
- [ ] Add educational tips (temperature, charging habits, avoid extreme heat, manufacturer guidance); do not present 20–80% as a universal mandatory rule.
- [ ] Provide Settings navigation hints only where deep links are supported.
- Acceptance: health UI never converts Android GOOD status into “100% health”; estimates disclose source and limitations.

### F. App power usage / sleep candidates
- [ ] Investigate feasible user-consented app usage visibility per Android version.
- [ ] If only UsageStats is available, show foreground time and recent usage—not energy drain or mAh.
- [ ] Protect system-critical apps and clearly explain any candidate suggestion.
- [ ] Do not terminate apps, force-stop apps, or label arbitrary apps as battery drainers without evidence.
- [ ] Do not ship a synthetic “sleep score”; any score must have a documented, reproducible formula using real observations.
- Acceptance: permission is opt-in, revocable, privacy-preserving and clearly explained; unsupported per-app energy is shown as unsupported.

### G. Memory, storage and optimization insights
- [ ] Show real RAM/storage totals only where platform APIs provide reliable values.
- [ ] Replace “Boost Score” with transparent measured indicators or omit it; no invented percentage.
- [ ] No one-tap cleaner or task killer. Provide actionable, user-controlled OS guidance.
- Acceptance: no app claims to free RAM by killing background apps or improve charging by cleaning storage.

### H. History, trends and reports
- [ ] Validate sampling cadence and history consent/retention behaviour.
- [ ] Add daily/weekly/monthly charged/discharged trends only when sample coverage supports them.
- [ ] Track battery wear only when actual capacity measurements support a defensible trend.
- [ ] Add export (CSV/JSON initially) for user-owned local history, with privacy warning and no cloud upload by default.
- [ ] Improve gaps/missing-data display; never interpolate as if observed.
- Acceptance: aggregates state their date range and sample coverage; export matches stored data.

### I. Battery-care reminders and notification preferences
- [ ] Add daily battery-care reminder inside Settings (no new tab).
- [ ] Separate this from the existing charge-target alert.
- [ ] Native scheduled local notification with enable/disable and selected time; cancel only its own scheduled notification.
- [ ] Web must clearly state closed-tab scheduling is unsupported unless a reliable service-worker push architecture is separately implemented.
- Acceptance: persisted preferences survive restart; permission denial is handled; no duplicate schedules.

## 5. Delivery sequence

1. **Phase 0 — Baseline audit & stabilization:** docs/capabilities, native validation, CI/security, web preview, splash issue.
2. **Phase 1 — Device & Battery Information:** trusted device metrics and capability details.
3. **Phase 2 — Charging Hub & Audible Target Alert:** measured live charging diagnostics and robust alert UX.
4. **Phase 3 — Drain Analysis:** real sample-based drain-rate analytics.
5. **Phase 4 — Health Assessment & Best Practices:** OS status vs labelled capacity estimate.
6. **Phase 5 — App Usage Research/Implementation:** only feasible, user-consented usage data; no fabricated per-app mAh.
7. **Phase 6 — History, Trends & Export:** sample-quality-aware analytics and exports.
8. **Phase 7 — Battery-care Reminders:** separate daily reminder settings.
9. **Phase 8 — Final production hardening:** accessibility, performance, privacy, security, device matrix and release checklist.

Phases may be reordered only when a dependency or test result justifies it. Do not build advanced UI on top of unverified data sources.

## 6. Engineering and release gates

For every workstream:
1. Inspect current implementation and reuse existing architecture.
2. Write acceptance criteria and platform limitations before coding.
3. Implement in a focused branch/PR; avoid unrelated rewrites.
4. Add meaningful tests for calculations, normalization, scheduling and failure cases.
5. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build:web`, and Android Gradle compile where applicable.
6. Record exact CI run/commit and physical-device evidence.
7. Update this document in the same PR: check completed items only when code and validation both pass; otherwise mark **implemented, pending validation**.
8. Preserve existing user data and navigation; schema changes require migrations and rollback considerations.

## 7. Current checkpoint for the next session

**Current status:** planning/documentation committed on `roadmap/production-feature-program`; no new product feature implementation has been started in this program yet.

**Audit findings from source inspection:**
- Native Kotlin currently attempts to read Android 14+ `BatteryManager.EXTRA_CYCLE_COUNT`; README and feature README disagree, and the feature README is stale.
- The Analytics breakdown explicitly removed prototype/sample app-consumption values. Per-app energy is not available; this is correct and must not be regressed with fabricated values.
- The telemetry capability model includes per-app power usage as `not-implemented`.
- Charging threshold monitoring and foreground service exist in code, but audible behaviour, screen-off operation, reboot recovery and OEM behaviour still require physical-device testing.
- Local SQLite history and inferred charging sessions exist; the browser adapter/docs need an end-to-end reconciliation and test.
- PR #6 remains open at baseline; CI run `41927519795` passed for commit `17024adcf921352c887b416c3cc0ed0bbc07ee0d`. This run does not prove physical Android behaviour.
- The repository homepage currently points to `https://voltguard-iota.vercel.app`; the preview/deployment must be checked directly before claiming the web testing environment is production-ready.

**Next action:** complete Phase 0 audit. Reconcile capability and README discrepancies, inspect telemetry/history/alerts implementation end-to-end, verify latest CI and Vercel preview, and record an actionable bug list. Then implement the first Phase 0 fixes in a focused PR.

**Important:** do not begin by building the reminder UI. First establish reliable telemetry, native alert behaviour and production build health. Read this file before continuing after a chat reset.
