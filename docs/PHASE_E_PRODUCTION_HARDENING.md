# Phase E — Production Hardening

**Branch:** `phase-e/production-hardening`  
**Base:** `phase-d/device-insights-async-native`  
**Status:** Audit started; implementation and acceptance validation are in progress.  
**Product constraints:** preserve the existing app and five-tab navigation; no demo telemetry, fake scores, cleaner/task killer, per-app mAh claims, automatic charge stopping, CSV export, or JSON export.

## Objective

Close the production risks that sit between the existing feature implementation and a release candidate. Phase E is not a feature redesign. It hardens data handling, permissions, native service lifecycle, dependency integrity, error handling, and release disclosures.

## Initial source audit

### Verified implementation

- Battery history is opt-in. Android and iOS use local SQLite; the web adapter explicitly rejects battery-history database access.
- History collection is performed by the foreground telemetry flow after explicit opt-in. It is not a general background telemetry collector.
- The history layer applies a 30-day retention window and disabling history deletes stored samples and charging sessions.
- Android Usage Access is optional and is used for app foreground-time data. The app correctly distinguishes this from actual per-app energy consumption.
- Android charging-threshold monitoring is implemented as a foreground service with a dedicated notification channel and a branded small notification icon.
- The Android manifest declares `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`, and `RECEIVE_BOOT_COMPLETED`; the service declares the `specialUse` subtype.
- Legal routes exist for Privacy Policy, Permissions & Data Use, Terms of Use, and About.

### Risks and required work

1. **Google Play foreground-service review:** Android 14+ `specialUse` is declared in the manifest. Before Play distribution, complete the Play Console foreground-service declaration and provide the required use-case evidence. Do not assume manifest compliance alone guarantees approval.
2. **Privacy wording:** clarify that local battery history is supported on Android/iOS and is unavailable in the web build. Review every statement against actual collection and storage behaviour. Publish an effective date and publisher/support details before public release.
3. **Legal readiness:** Terms currently state that publisher contact details and legal review are still required. These are release blockers, not code tasks that can be silently marked complete.
4. **Permission lifecycle:** verify notification denial/revocation, alarm-channel changes, Usage Access grant/revoke, service start/stop, and return-from-Settings behaviour on physical Android hardware.
5. **Service lifecycle:** verify threshold re-arming, screen-off operation, reboot/app-replacement recovery, force-stop limitations, and OEM battery restrictions. Document any observed differences by device/OS.
6. **Dependency security:** the committed lockfile still has audit findings. The selective SDK 54 remediation preview is a separate validation artifact, not an adopted dependency update. Do not commit package manifest and lockfile out of sync, and do not force Expo SDK/Router major upgrades to satisfy npm audit.
7. **Data lifecycle:** test opt-in, opt-out deletion, manual clear, retention cleanup, and failure paths. Confirm no stale UI state suggests history is still available after deletion or storage failure.
8. **Release observability:** decide what crash/error diagnostics are appropriate without uploading private battery history or UsageStats. Any network telemetry must be disclosed and must not include sensitive device/app usage data by default.

## Phase E work plan and acceptance criteria

### E1. Privacy and data lifecycle
- [ ] Trace every battery-history write and prove it is gated by the saved opt-in preference.
- [ ] Test enabling, disabling, clearing, retention expiry, and database failure on Android/iOS.
- [ ] Confirm web never claims to persist battery history; preferences remain separate browser-local data.
- [ ] Audit logs, analytics, AI/network paths and third-party SDKs for accidental battery-history or UsageStats transmission.
- [ ] Update Privacy Policy and Permissions & Data Use copy only after the code/data-flow audit is complete.
- [ ] Verify unsupported routes/invalid legal slugs do not silently display a misleading policy.

**Acceptance:** collection and retention match the UI and legal text; opt-out removes stored battery samples and charging sessions; no private battery history or app-usage data is transmitted without a separately disclosed and consented feature.

### E2. Android permissions and service reliability
- [ ] Verify every permission is necessary and declared at the narrowest available scope.
- [ ] Test Android 13+ notification permission denial and later grant.
- [ ] Test channel disabled, low importance, silent sound, vibration disabled, and DND/volume restrictions.
- [ ] Test Usage Access grant/revoke and app resume.
- [ ] Test foreground service start/stop, threshold change, one alert per charging session, unplug re-arm, screen-off, reboot and app replacement.
- [ ] Verify force-stop and OEM restrictions are explained accurately; do not promise uninterrupted operation.
- [ ] Confirm the ongoing notification uses VoltGuard branding and a valid small icon.

**Acceptance:** no duplicate threshold alarm in one charging session; a new session can alert again; failures are surfaced without falsely reporting monitoring as active; physical-device results are recorded.

### E3. Security and dependency integrity
- [ ] Review Android exported components, intent handling, pending-intent flags, storage boundaries and permission exposure.
- [ ] Review SQL access for parameterization and safe bounds.
- [ ] Review package scripts, dependency lifecycle scripts, lockfile consistency and CI permissions.
- [ ] Adopt only dependency changes that pass Expo SDK compatibility, tests, web export and Android compilation.
- [ ] Keep the audit report separated into production vs development-only dependencies and distinguish exploitable runtime risk from build-tool findings.

**Acceptance:** no unjustified broad permission, exported component, unsafe SQL construction or unreviewed major dependency override remains; the exact lockfile used for validation is committed.

### E4. Runtime resilience and accessibility
- [ ] Audit loading, stale, unavailable, permission-denied and retry states across the five tabs.
- [ ] Verify mounted-state and in-flight guards around asynchronous native calls.
- [ ] Check notification scheduling rollback and persistence failure paths.
- [ ] Check accessibility labels, roles, focus order, contrast, text scaling and safe-area layout.
- [ ] Check repeated refreshes and long-running screen sessions for avoidable allocations or duplicate subscriptions.

**Acceptance:** no uncaught permission/storage/native errors in supported flows; no stale reading is presented as live; critical controls remain accessible on narrow screens and with larger text.

### E5. Release gate
- [ ] TypeScript, unit tests, lint, web export and Android native compile pass on the final Phase E commit.
- [ ] Security audit report is reviewed and remaining findings are documented with ownership/mitigation.
- [ ] Privacy and Terms are finalized with real publisher contact and effective date.
- [ ] Google Play special-use foreground-service declaration is ready for submission.
- [ ] Physical Android test matrix and web smoke test are attached to the release candidate.
- [ ] Confirm app version, icon, splash, package identifier, signing, store assets and open-source license notices.

**Acceptance:** Phase E may close only when code checks pass and non-CI release obligations are either completed or explicitly tracked as release blockers.

## Remaining phases after Phase E

### Phase F — Physical Device Validation
Validate the actual app on supported Android devices and at least one iOS device if iOS is in the release scope. Record model, OS version, readings exposed, alert behaviour, permissions, screen-off operation, reboot recovery, and OEM restrictions. This phase closes the gap CI cannot prove.

### Phase G — Release Candidate and Distribution
Prepare signed production builds, verify app identifiers and store metadata, finalize legal disclosures, complete Google Play special-use foreground-service declarations, run store-policy checks, and conduct a controlled release-candidate smoke test. No public release before required Play approval.

### Phase H — Launch Monitoring and Maintenance
After release, monitor crashes, startup failures, permission-related support issues, battery-monitor reliability and store feedback. Ship focused fixes, maintain dependency updates, and rerun the device regression matrix for native or Expo upgrades. Do not add remote collection of battery history or UsageStats as a monitoring shortcut.

## Working rules

- Work in focused commits and PRs; do not merge automatically.
- Keep existing navigation and user data.
- No CSV/JSON export.
- Never represent foreground app usage as battery energy consumption.
- Never claim VoltGuard can stop charging or bypass Android notification/system restrictions.
- Mark an item complete only with code plus validation evidence. Physical-device and store-review requirements cannot be checked off by CI alone.
