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


## 8. Phase 0 audit update — 2026-11-05

**Work branch:** `phase-0/stabilization-audit`

### Completed in this audit commit
- [x] Corrected `src/features/battery/README.md`: documents Android 14+ conditional cycle-count read; clearly separates web localStorage preferences from unsupported web SQLite history; clarifies opt-in local sampling, 30-day retention and foreground-only refresh.
- [x] Updated `.github/workflows/ci.yml` so pull requests targeting `phase-6/web-testing` are included in CI, and push validation runs on the roadmap/stabilization branches.
- [x] Confirmed PR #6 is open, clean/mergeable, and has successful TypeScript, unit-test, lint and web-export CI at commit `17024adcf921352c887b416c3cc0ed0bbc07ee0d`.
- [x] Confirmed PR #7 is open and clean/mergeable; this stabilization branch is based on the roadmap branch and will include its tracker.

### Findings still requiring work or device evidence
- [ ] Android threshold alarm currently sends a notification from the native service; actual audible output depends on channel sound, notification permission, user channel settings, DND, volume and OEM policy. Inspect service implementation and add robust channel diagnostics/test path; physical-device test remains mandatory.
- [ ] Native Android diagnostics have not been physically verified on the target device.
- [ ] No trustworthy per-app mAh/energy API is implemented. The breakdown screen correctly states this limitation.
- [ ] Web battery-history database remains unsupported. The Settings/history hook catches storage errors; UI behaviour needs review to ensure the unsupported state is clearly communicated.
- [ ] Investigate current sample recording cadence and possible duplicate writes in `useBatteryTelemetry`/history layer before using samples for drain analytics.
- [ ] Inspect README root and package/dependency lockfile for security findings; no dependency remediation has been performed yet.
- [ ] Native splash/startup issue remains unverified.

### CI status for this branch
The workflow change has been committed, but its new Actions run has not yet been observed at the time of this update. Do not report it green until GitHub Actions confirms success.

### Next implementation step
Inspect native foreground service and notification channel creation end-to-end. Verify channel ID/importance/sound, one-alert-per-charge-session rearming, permission error reporting, service start/stop and reboot receiver behaviour. Add tests where logic can be isolated. Do not claim sound works until physical-device verification.


### Charging alarm hardening implementation update — 2026-11-05

**Implemented in source on `phase-0/stabilization-audit`; CI and device validation pending.**
- [x] Added a dedicated Android `battery-threshold-alarm-v2` notification channel at HIGH importance.
- [x] Configured alarm-category audio attributes, system alarm sound URI, vibration pattern and lights at channel creation.
- [x] Added native channel readiness diagnostics: app notification permission, channel enabled state, high importance, sound and vibration.
- [x] Added a native test-alarm action and Settings button so users can verify audible output on their own device.
- [x] Routed background threshold notifications through the same shared native notification builder/channel.
- [x] Added explicit JS/web stubs so browser builds do not attempt to invoke Android native APIs.
- [x] Preserved one-alert-per-charge-session and unplug re-arming logic in the foreground service.
- [ ] Verify Kotlin compile and TypeScript checks on the latest commit; Actions runs `41937640739` and `41937632241` are pending.
- [ ] Test on a physical Android device: test alarm with screen on/off, confirm sound and vibration, change channel to silent/low importance and verify VoltGuard explains the issue, then restore settings and verify delivery.
- [ ] Verify OPPO/OEM battery-management settings and reboot restoration. Do not claim OEM-independent reliability.
- [ ] Verify upgrade behaviour: Android channel settings are user-controlled and immutable by app after channel creation. The new channel ID avoids inheriting the old default-importance channel; users can still silence it.

**Important limitations:** the app does not bypass Do Not Disturb, alarm volume, notification permission, channel settings, force-stop, or OEM background restrictions. A test notification being posted is not proof that the phone physically played sound; the user must confirm audibility. No exact-alarm permission is required for this event-driven foreground-service threshold check.

**Next:** wait for CI. If green, merge the stabilization PR after review. Then install the new Android build and physically test the alarm. Only after that move to Phase 1 Device & Battery Information.


## Phase 1 — Device & Battery Information progress — 2026-11-05

**Implementation branch:** `phase-0/stabilization-audit`

### Completed in source
- [x] Added Android battery technology from `BatteryManager.EXTRA_TECHNOLOGY`.
- [x] Normalized signed battery current into mA for instantaneous and average current; charging/discharging direction is retained.
- [x] Normalized charge counter into mAh and energy counter into mWh.
- [x] Exposed new capability flags for battery technology, current, remaining charge and energy counter.
- [x] Extended the dashboard with a Battery hardware details card: technology, available charge, instantaneous/average battery current, energy counter and cycle count.
- [x] Kept unavailable readings explicitly unavailable; no sample or inferred hardware values added.
- [x] Added unit tests for conversions and null/unavailable values.

### Engineering caveats
- BatteryManager current is battery-side current, not a verified USB adapter input-current measurement. The UI labels it accordingly.
- `BATTERY_PROPERTY_CHARGE_COUNTER` is remaining charge reported by the fuel gauge, not nominal/design battery capacity.
- `BATTERY_PROPERTY_ENERGY_COUNTER` is optional and vendor dependent.
- Android's cycle count is only read when API level is 34+ and the battery intent supplies a valid non-negative value.
- Android's `EXTRA_HEALTH` is OS-reported status, not a percentage-based battery health/capacity estimate.
- These Android fields are not exposed on web/iOS by this adapter.

### Pending validation
- [ ] Latest CI run must pass TypeScript, unit tests, lint, web export and Android Kotlin compilation.
- [ ] Physical-device validation on the user's OPPO device is still required to confirm which fuel-gauge fields are supported and their units/signs.
- [ ] Review capability state preservation in live event updates and ensure web build does not reference native-only fields incorrectly.
- [ ] Add model/manufacturer/API metadata to the diagnostics screen only if available from a stable API and necessary for troubleshooting.

### Next Phase 1 work
Improve battery health presentation: distinguish Android OS-reported health state from estimated battery capacity/condition. Do not manufacture a health percentage when the OS does not expose one. Then add battery drain trend analysis based only on timestamped local samples, with confidence/coverage indicators and no fabricated per-app attribution.


## Battery health and drain analysis checkpoint — 2026-11-05

**Branch:** `phase-0/stabilization-audit`

### Implemented in source
- [x] Added a pure battery health interpreter that preserves the Android OS health status and explicitly does not turn it into a battery-wear percentage.
- [x] Added a pure device-level discharge-rate analyzer using timestamped battery percentage observations.
- [x] Analyzer excludes charging/full observations, invalid percentages/timestamps and windows with gaps greater than six hours; minimum observation window is five minutes.
- [x] Analysis reports percent/hour, observation duration, sample count, coverage tier and cautious possible causes; it does not attribute drain to an app.
- [x] Added a local query for the latest 24 hours of opted-in SQLite samples (maximum 500 rows); web and history-disabled states return insufficient data.
- [x] Added dashboard cards for OS-reported health interpretation and device-level drain analysis.
- [x] Added tests for rate calculation, charging exclusion, sparse gaps, OS health and unknown states.
- [ ] CI validation for TypeScript, lint, tests, web export and Android compilation.
- [ ] Validate drain-rate thresholds against real devices and longer observation sessions; current 8%/hour and 15%/hour labels are initial review heuristics, not medical/manufacturer standards.
- [ ] Add explicit UI guidance that history must be enabled and samples collected before analysis is available.
- [ ] Verify that current history recording cadence is adequate and does not duplicate observations excessively.
- [ ] Physical-device validation on Android; no production claims until data collection is tested on the target device.

### Interpretation constraints
- A percentage-per-hour estimate is coarse because battery percentage is quantized and fuel-gauge reporting varies.
- The current analyzer is device-level only. It cannot identify which app caused discharge.
- No actual capacity/wear percentage is calculated because the adapter does not have verified design capacity and full-charge capacity.
- OS-reported GOOD/OVERHEAT/DEAD/etc. is displayed as an OS state, not converted into a percentage.
- The analyzer uses only local, user-opted-in history. It does not upload battery samples.

### Next
Run CI and fix all failures. Then continue with Charging Detect & Optimization Hub using real current/voltage/source and safe system-setting deep links. Per-app energy, deep sleep and protected-app management remain blocked pending public API feasibility work; do not implement fake versions.


## Charging Detect & Optimization Hub checkpoint — 2026-11-05

**Branch:** phase-0/stabilization-audit

### Implemented in source
- [x] Added native read-only diagnostics for Android location enabled state, automatic brightness mode, Bluetooth adapter state, NFC adapter state and master background sync state. Unsupported/unreadable values remain null.
- [x] Added a strict allowlist of user-directed Android Settings intents for display, location, Bluetooth, NFC and sync settings. VoltGuard does not toggle these settings itself.
- [x] Exposed optimization diagnostics and settings shortcuts through the Expo native module bridge.
- [x] Added a dashboard Charging Detect & Optimization section with real setting states and explicit unavailable states.
- [x] Kept the existing battery-side current and voltage readings; copy explicitly states current is not USB adapter input current.
- [x] Web/iOS show platform limitation and do not invoke Android native methods.
- [ ] Kotlin compile, TypeScript, lint, unit tests and web export must pass on the latest commit.
- [ ] Verify native Settings intents open correctly on the target Android/OEM version; NFC settings intent may be absent on some devices and should fail gracefully.
- [ ] Confirm the dashboard refresh cadence does not cause unnecessary native polling; current read is triggered alongside telemetry updates.
- [ ] Validate current sign convention and source labels against physical device readings.
- [ ] Adapter input current / USB-PD negotiation is not implemented; Android BatteryManager current remains battery-side current only.
- [ ] No automatic toggles, forced app termination, RAM cleaner or guaranteed charging-speed claims.

### Next
1. Run full CI and fix all compile/test issues.
2. Verify optimization states on a physical Android phone.
3. Continue with battery-care reminders and usage/deep-sleep feasibility only after checking Android public API access. Per-app mAh and deep-sleep counters remain unimplemented unless supported by a verifiable public API.


## Battery-care reminder and stabilization fixes — 2026-11-05

**Branch:** `phase-0/stabilization-audit`

### Implemented in source
- [x] Added a separate daily battery-care reminder in Settings; it is not a new navigation tab.
- [x] Added local daily notification scheduling for Android/iOS with preset local times (07:00, 12:00, 20:00).
- [x] Persisted enabled state, selected time and this reminder's own scheduled notification ID in the existing local preference store.
- [x] Replaces only its own prior scheduled notification; it does not cancel unrelated user notifications.
- [x] Schedules a replacement before cancelling the prior reminder, so a failed replacement does not silently remove an active schedule.
- [x] Web explicitly reports that closed-tab scheduled reminders are unsupported; no fake background scheduler is claimed.
- [x] Added a matching web implementation for Android-only battery module exports.
- [x] Corrected symmetric rounding for signed battery current conversions and added regression coverage.
- [x] Tightened drain analysis to require every sample in a candidate window, including endpoints, to be unplugged.

### Validation and limitations
- [ ] Latest Actions for commit `03363d79906715a6b282815bc71b435dbd473823` must pass all jobs before merge.
- [ ] Verify the Expo Notifications daily trigger compiles under SDK 54 and schedules on Android and iOS.
- [ ] Verify reminder delivery after app process termination and after device restart on physical devices; OEM battery policies may delay delivery.
- [ ] Confirm permission denial and rescheduling errors are clearly visible in Settings.
- [ ] Physical Android alarm audibility still requires user confirmation through the Settings test button.
- [ ] Do not promise exact-to-the-minute delivery or guaranteed alarm-volume bypass; Do Not Disturb, channel settings, Focus modes and OS battery policies remain in control.


## Phase 5 — Android app foreground-usage insights — 2026-11-05

**Branch:** `phase-0/stabilization-audit`

### Implemented in source — validation pending
- [x] Declared Android `PACKAGE_USAGE_STATS` special access in the native module manifest; it is not requested as a normal runtime permission.
- [x] Added an explicit Usage Access settings shortcut and native permission-state check using AppOps.
- [x] Queried Android `UsageStatsManager` for a rolling 24-hour window and returned per-package foreground duration and last-used timestamp.
- [x] Aggregated duplicate daily interval rows by package, sorted by foreground duration and capped the UI result at 20 apps.
- [x] Excluded VoltGuard itself from the list.
- [x] Added app label resolution with package-name fallback when Android package visibility prevents resolving a label.
- [x] Added a breakdown-screen permission explanation, grant-settings action, refresh control, foreground-time list and explicit date-window/coverage caveats.
- [x] Added typed native bridge methods and web stubs; web/iOS do not call Android Usage Access.
- [x] No app-usage events are persisted or uploaded; the query is on demand and local.

### Privacy, platform and product constraints
- Usage Access reveals app-usage patterns and must remain optional, user-initiated and revocable.
- Google Play distribution requires a policy review of the declared Usage Access purpose and prominent disclosure. Do not assume permission declaration alone guarantees Play approval.
- Android's usage summaries may be delayed, bucketed, incomplete or unavailable immediately after access is granted.
- Foreground duration is not battery drain. Do not convert it to mAh, drain percentages, or a “top battery consumers” ranking.
- Package names may be displayed where app labels cannot be resolved due to Android package visibility; do not add `QUERY_ALL_PACKAGES` merely to improve labels.
- No background surveillance, screen contents, keystroke collection, message access or remote upload is implemented.

### Validation gate
- [ ] TypeScript, lint, unit tests and web export must pass on the latest branch commit.
- [ ] Android Kotlin compile must pass on the same commit.
- [ ] Physical-device test on target Android: no access, grant access, return to app, refresh, revoke access, and test empty/partial usage history.
- [ ] Verify package label fallback and duration aggregation against Android Settings > Digital Wellbeing / App usage for a comparable time window.
- [ ] Review Play Console Usage Access policy and prominent disclosure before public distribution.

### Next
Implement real RAM and storage diagnostics only where native platform APIs provide valid totals/available values. Do not turn free RAM into a “boost score,” promise performance improvements, or add a task-killer/cleaner.


## Android device resource diagnostics — 2026-11-05

### Implemented in source — validation pending
- [x] Added Android `ActivityManager.MemoryInfo` reads for total RAM, available RAM and low-memory state.
- [x] Added Android `StatFs` reads for total and available internal data-partition storage.
- [x] Added typed bridge methods and web/iOS-safe null implementations.
- [x] Displayed resource readings in the existing Analytics screen; no new navigation tab.
- [x] Explicitly avoided synthetic boost scores, task killing, memory cleaning or performance claims.

### Limitations and validation
- [ ] Confirm Kotlin compilation and all JS checks on the latest commit.
- [ ] Compare RAM values with Android system memory diagnostics and storage values with Android Settings on a physical device.
- [ ] These are system-wide snapshots and can change between reads; they are not app-specific memory use.
- [ ] Available RAM is not a target to maximize. Android intentionally uses free memory for cache and background process management.
- [ ] Storage values represent the app-visible data partition reported by StatFs, not necessarily every removable or adopted storage volume.
