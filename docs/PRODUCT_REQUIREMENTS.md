# VoltGuard AI — Product Requirements & Delivery Plan

**Status:** Draft for implementation planning  
**Prepared:** 2026-11-11  
**Scope:** Android, iOS and web; preserve the existing five-tab navigation.

## 1. Product objective

VoltGuard AI helps users understand their device battery, charging activity and battery-care trends through trustworthy platform readings and clear, useful controls. The product must favour measured data over decorative scores, keep local data private by default, and present a polished consumer interface.

This file is the consolidated product plan. The repository did not contain a standalone PRD when this document was prepared. The existing `docs/PRODUCTION_FEATURE_PROGRAM.md` remains the engineering history and implementation checklist; its original baseline section is older than the later phase updates and must not be treated as a current status report on its own.

## 2. Product and user-interface requirements

### 2.1 User-facing copy

- Remove long engineering explanations, feature-roadmap text, and repeated descriptions of what the app cannot do from ordinary screens.
- Prefer concise labels, values, timestamps, status indicators and actionable error messages.
- Do not show “coming soon” cards or empty explanatory panels for features that are not shipped.
- Do not hide an essential permission request, data-consent choice, safety warning, or legal disclosure. Put detailed technical and platform disclosures in the relevant Legal & Privacy pages.
- Never display fabricated readings, app rankings, battery-health percentages, optimization scores or simulated background activity.
- Where a required value is unavailable, use a compact state such as “Unavailable”; do not substitute an estimate unless the estimate has a documented formula and is labelled.

### 2.2 Branded background notification

- Replace the generic Android system charging icon used by the ongoing foreground-service notification and threshold notification with a VoltGuard-branded monochrome notification icon.
- Add a dedicated Android notification drawable/vector resource. Do not use a full-colour launcher/adaptive icon as the status-bar small icon.
- Use consistent product naming (“VoltGuard AI”) in the notification title and app metadata.
- Keep the ongoing notification compact and tappable; tapping it opens VoltGuard.
- Keep the charging threshold alert separate from the low-priority ongoing-service notification.
- Preserve one threshold alert per charging session and re-arm after unplugging.

### 2.3 Settings information architecture

Keep the existing Settings tab. Replace the non-functional “Other settings” placeholder with a real tappable row that opens a dedicated settings screen. Use grouped rows and nested pages so users choose a section before its controls are displayed.

Settings landing page:
- Battery history and its clear-history action.
- Charging target alert and threshold selection.
- Audible alarm readiness and test action on supported Android builds.
- Daily battery-care reminder and time selection on supported native platforms.
- Other settings.
- Privacy & Legal.

Other settings page:
- Appearance preference (System, Light, Dark), integrated with the existing theme context.
- Temperature display preference (°C/°F) if all affected screens can use one shared formatter.
- Haptic feedback preference only where haptics are actually used.
- App version/build information.
- Data controls and notification preferences only where they correspond to real implemented behaviour.

Do not add switches that have no working implementation. Avoid exposing a refresh-rate control until telemetry profiling proves the options are safe and useful.

### 2.4 Privacy and legal pages

Add navigable pages reachable from Settings:
- Privacy Policy.
- Terms of Use.
- Permissions & Data Use.
- Open-source licences / third-party notices.
- About VoltGuard AI.

The Privacy Policy must be written from a verified data-flow inventory, not a template. Confirm the actual behaviour of battery history, local preferences, Android Usage Access queries, notifications, AI/network features, diagnostics, crash reporting and any third-party SDKs before making claims. State what is collected, why, where it is stored, retention, whether it leaves the device, and how users can disable or delete optional data.

Terms must identify the product purpose, user responsibilities, warranty/liability terms, and the fact that VoltGuard is not a replacement for the operating system or manufacturer battery diagnostics. The legal pages require a supplied support/contact address and a legal review before public release. Do not invent a company entity or contact address.

## 3. Battery telemetry requirements

### 3.1 Data correctness

- Android BatteryManager is the preferred source for Android-specific hardware diagnostics when the native module is installed and returns valid values.
- Use Expo Battery as the cross-platform source and fallback where appropriate.
- Keep battery percentage, charging state, voltage, temperature, health state, charging source, current, technology, cycle count, charge counter and energy counter separately typed and unit-labelled.
- Preserve current direction/sign. Distinguish battery-side current from USB adapter input current.
- Reject sentinel, non-finite, out-of-range and malformed values. Unsupported values stay null; do not infer device chemistry or capacity from a model name.
- Keep OS-reported health status separate from any capacity/wear estimate.
- Add provenance and an observation timestamp per diagnostic snapshot. A battery-level event must not make older voltage/current/temperature readings appear newly observed.
- On refresh failure, mark the affected values stale/unavailable and show the last valid timestamp; never silently present stale data as live.

### 3.2 Efficiency and lifecycle

- Use platform battery listeners for immediate percentage and charging-state changes; do not poll these values every second.
- Refresh Android hardware diagnostics on app resume, manual refresh and a measured, rate-limited foreground cadence.
- Pause foreground polling while the app is inactive/backgrounded. The Android foreground service should monitor only the threshold-alert use case.
- Prevent overlapping snapshot requests with a single-flight refresh guard.
- Avoid re-rendering for unchanged values and avoid duplicate persisted samples.
- Record history only after explicit opt-in. Keep local retention bounded (currently 30 days) and document any platform-specific storage differences.
- Profile actual native calls, render frequency and sample writes before tuning the refresh interval. Optimise for correctness without draining the battery being monitored.

### 3.3 Required automated tests

Test unit conversion, rounding, signed current, sentinel handling, invalid ranges, source precedence, partial events, stale timestamps, failed refreshes, in-flight refresh protection, sample deduplication and charging-session transitions. Add integration tests for Android event delivery where the native test environment permits it.

## 4. Product feature inventory

The following items come from the existing production feature program and its later phase updates. “Implemented in the stabilization branch” is not the same as “released”; it still requires CI and device validation.

| Feature | Current assessment | Remaining work |
|---|---|---|
| Device and battery diagnostics | Implemented in the stabilization branch: technology, signed battery current, charge/energy counters and dashboard details were added. | Confirm CI, physical-device support, units and source timestamps. |
| OS battery-health interpretation | Implemented in the stabilization branch. | Verify UI states; do not show a wear percentage without validated design and full-charge capacity. |
| Device-level drain analysis | Implemented in the stabilization branch using opted-in, timestamped samples. | Validate sample cadence, thresholds, sparse-data handling and confidence/coverage display on real devices. |
| Charging Detect & Optimization Hub | Implemented in the stabilization branch with read-only Android settings diagnostics and supported Settings shortcuts. | Test intents and values on target OEM versions. Never silently toggle protected settings. |
| Battery trends | Implemented in the stabilization branch for observed charge/discharge intervals. | Validate weekly/monthly aggregation and missing-data treatment. |
| App usage insights | Implemented in the stabilization branch using optional Android Usage Access foreground-duration data. | Verify access grant/revoke and Play policy disclosures. Foreground time is not battery energy. |
| RAM and storage diagnostics | Implemented in the stabilization branch using Android system APIs. | Compare against device settings on a physical phone; do not add a cleaner or boost score. |
| Daily battery-care reminder | Implemented in the stabilization branch; reminder mutation reliability is being hardened in PR #10. | Validate schedule replacement, restart delivery, permission denial and OEM behaviour. |
| Local battery history | Native opt-in SQLite history exists, with bounded retention. | Validate sample quality, duplicate prevention, deletion and UI behaviour. Web history is not currently supported. |
| Per-app battery energy (mAh) | Not implemented. | Do not claim or simulate it. Revisit only if a supported public API provides trustworthy measurements for ordinary apps. |
| Deep-sleep / screen-off attribution | Not implemented. | Do not infer it from foreground samples. Revisit only with reliable OS counters. |
| Battery wear percentage | Not available from current validated inputs. | Add only when real design capacity and full-charge capacity are exposed and validated. |

### Explicit exclusions

- No CSV or JSON export.
- No fabricated per-app energy attribution, sleep rankings, boost scores or cleaner.
- No task killing, force-stopping other apps, protected-app manipulation or automatic system-setting toggles.
- No automatic charge stop/limit claim. A threshold alert is a user reminder.
- No claim that Android alert sound bypasses notification-channel settings, volume, Do Not Disturb, force-stop or OEM restrictions.

## 5. Delivery phases

### Phase A — User-facing polish, branded alerts and Settings foundation

1. Remove verbose engineering/limitation copy from Dashboard, Analytics, Profiles, History and Settings. Keep concise statuses and required safety/privacy disclosures.
2. Add the VoltGuard monochrome Android notification icon and use it for both foreground-service and threshold notifications.
3. Replace “Other settings” placeholder with a real navigation row and dedicated screen.
4. Add Privacy & Legal navigation and the initial Privacy Policy, Terms, Permissions & Data Use, About and licence pages.
5. Add route, accessibility, deep-link, back-navigation and responsive-layout tests.

**Exit criteria:** no placeholder “Other settings” content remains; notification icons are branded; all Settings rows work; legal pages are reachable; no required safety or consent disclosure is lost.

### Phase B — Battery telemetry reliability and efficiency

1. Audit source precedence and make Android snapshots internally consistent.
2. Separate timestamps/provenance for native diagnostics and fast-changing battery events.
3. Add single-flight refresh, lifecycle-aware refresh, bounded native polling and event-based updates.
4. Prevent stale values from being presented as live.
5. Deduplicate history writes and test sampling cadence.
6. Add unit/integration coverage for failure, partial-event and device-specific readings.

**Exit criteria:** accurate units/signs, correct timestamps, no overlapping refreshes, no repeated unchanged sample writes, no stale-as-live UI, and measurable battery overhead within the agreed budget.

### Phase C — Existing feature completion and device verification

1. Validate Device & Battery details.
2. Validate Charging Detect & Optimization states and Settings shortcuts.
3. Validate health interpretation, drain analysis and 7/30-day trends against real observed samples.
4. Validate app foreground-time access grant/revoke and resource readings.
5. Validate daily reminders and charge-target alert lifecycle.
6. Reconcile UI, docs and platform capability flags.

**Exit criteria:** required CI passes and each Android-only feature has a recorded physical-device test result. An unverified value remains labelled or hidden appropriately.

### Phase D — Privacy, security and store readiness

1. Complete a data-flow and third-party SDK audit.
2. Finalise Privacy Policy and Terms with verified behaviour, support contact and legal review.
3. Review Android special-use foreground-service justification and Usage Access disclosure for Play distribution.
4. Review permissions, notification channel defaults, data deletion and local retention.
5. Run dependency, secret, permission and release-configuration checks.

**Exit criteria:** legal text matches actual code; permissions are necessary and explained at point of use; no undisclosed data upload or unsupported policy claim.

### Phase E — Release validation

1. Run typecheck, tests, lint, web export and Android native compilation on the exact release commit.
2. Verify browser preview and web platform fallbacks.
3. Test Android foreground notification, threshold crossing, unplug re-arming, screen-off operation, reboot recovery, permission revocation and OEM battery management.
4. Test iOS reminder/foreground behaviour without promising continuous background battery monitoring.
5. Verify installation, startup/splash, safe-area layout, accessibility, performance and data migration.
6. Publish only after all release gates pass.

**Exit criteria:** CI is green, physical-device checklist is signed off, production web deployment is verified, and Android store declarations/legal content are ready.

## 6. Engineering rules

- Preserve the current five-tab navigation; use nested Settings pages and focused detail routes.
- Implement each phase on a focused branch and PR.
- Do not mark work complete from documentation alone. Require code, automated checks and device evidence where hardware is involved.
- Keep product copy concise; keep engineering implementation details in repository documentation.
- Update this PRD and `docs/PRODUCTION_FEATURE_PROGRAM.md` in the same PR as each completed milestone.
- Do not ship a new capability until its data source, permission, lifecycle, privacy impact and failure state are understood.
