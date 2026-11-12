# VoltGuard AI — Product Upgrade Roadmap

**Status:** Proposed plan, not yet implementation  
**Planning branch:** `planning/onboarding-antitheft-monitor-widgets`  
**Visual references:** User-provided Anti-Theft settings and Battery Monitor screenshots  
**Baseline:** Existing Phase D device-insights architecture and Phase E production-hardening work

## Product direction

Upgrade VoltGuard AI into a polished Android-first battery monitoring and device-protection app. Preserve the existing light/professional product direction and native architecture. The supplied screenshots are functional inspiration for information hierarchy and controls, not a pixel-for-pixel design target.

Do not merge unfinished pull requests merely to clear the queue. Merge in dependency order only after their relevant checks pass. No CSV/JSON export feature is in scope.

## Pull-request merge gate before feature implementation

Current open requests:
- PR #14 — Phase D native device insights.
- PR #15 — selective dependency-remediation CI preview.
- PR #16 — Phase E production hardening.

Required sequence:
1. Resolve PR #14's validation blockers and confirm Android compilation, TypeScript, tests, lint and web export.
2. Resolve PR #15's failing selective-remediation preview. Its CI-only override experiment is not a production dependency fix; do not merge a workflow that gives a false sense of dependency security. Commit package.json and lockfile together only after a compatible, tested solution is established.
3. Finish PR #16 against the accepted Phase D base. Its regular Android compile and TypeScript/test/lint/web-export jobs must pass. The production audit failure must be explicitly resolved or documented as an accepted, time-bounded risk with a remediation owner; do not silently waive it.
4. Rebase/re-target dependent PRs as necessary, then merge in order: #14, approved #15 changes, #16.
5. Verify main and production preview after each merge before starting feature implementation.

## Phase E — Finish current production hardening

- Complete privacy/data-flow audit and verify opt-in battery history enforcement at every write entry point.
- Verify 30-day retention and opt-out deletion.
- Review Android foreground-service type, notification channel, permission denial, process death, reboot and stop paths.
- Review storage, error handling, accessibility, runtime resilience and dependency vulnerabilities.
- Keep claims aligned with Android public APIs.
- Exit criteria: CI green for required jobs, audit findings dispositioned, no known critical/high unowned production dependency issue, PR reviewed and merged.

## Phase F — First-run onboarding and permission setup

### User journey
Splash → welcome/benefit onboarding → feature overview slides → permission setup guide → app dashboard.

### Onboarding
- Short, useful illustration-led slides with clear headings and concise messages.
- Continue/back controls, progress indicator, skip option, and persistent completion state.
- Do not repeat onboarding after completion unless the user chooses to revisit it.
- Use custom illustrations or clean vector assets consistent with VoltGuard branding; avoid emoji artwork.

### Permission setup
- Present one permission at a time with a plain-language reason, what feature it unlocks, and a clear system-settings/request action.
- Show granted, not granted, and restricted states accurately.
- Allow deferral for non-essential permissions; do not trap users in setup.
- Request runtime permissions in context and launch special-access settings only after explanation.
- Candidate permissions/capabilities: notifications, foreground service notification, Usage Access (for app foreground-time insights), and any camera/flash capability only if the user enables flash alerts.
- Battery optimization exemption must be optional and requested only where technically justified; explain manufacturer-specific settings.
- Do not request broad package visibility such as QUERY_ALL_PACKAGES without a documented Play-policy justification.
- Add a permissions centre in Settings to revisit access and diagnose revoked permissions.

### Exit criteria
- Fresh install, upgrade install, skipped setup, denied permission, permanently denied/restricted permission, returning user and revoked-permission flows tested.
- No repeated permission prompts or misleading "all permissions required" messaging.

## Phase G — Anti-Theft charging disconnect protection

### Core behaviour
- User explicitly arms protection for the next charging session (One Time) or until manually disabled (Always).
- When armed and a charger disconnect event is detected, start a configurable siren/alarm with sound and optional vibration/flash.
- One Time disarms after the event; Always remains armed according to the user's explicit setting.
- Provide a visible armed state, clear disarm action, and authenticated stop/disarm option.
- Support PIN/password and Android BiometricPrompt where available; biometric unlock is optional and must have a secure fallback.
- Include configurable trigger delay/countdown to reduce false alarms, sound selection from licensed/system-provided tones, volume preference where Android permits, vibration toggle and flash toggle.
- Show an ongoing, branded foreground notification while armed, with a safe, intentional action to open the app and disarm.

### Engineering and safety constraints
- Use Android power connection broadcasts while a properly declared foreground service is active; persist armed state and recover only through allowed Android lifecycle paths.
- Handle notification permission denial and foreground-service start restrictions explicitly.
- Do not claim guaranteed protection if the app is force-stopped, device is powered off, the OS/OEM kills the service, notification/foreground-service restrictions block it, or the device is rebooting before recovery.
- Do not bypass Do Not Disturb, lock-screen security, or Android audio controls. Alarm volume and flash behaviour remain subject to OS/device settings.
- Flash alert is optional, hardware-checked, time-bounded and thermally safe; request camera permission only when enabled.
- Avoid full-screen intent unless a narrowly applicable Android policy permits it; a high-priority notification plus in-app alarm control is the baseline.
- Add abuse/false-trigger safeguards, event logging local to device, and a clear privacy explanation.

### Exit criteria
- Tests for charger connect/disconnect, one-time/always state transitions, delayed trigger, authentication, repeated events, service restart, notification denial, reboot and failure-to-start.
- Physical tests on multiple Android API levels and OEM devices before release.

## Phase H — Expanded Battery Monitor dashboard

Build a dedicated Battery Monitor screen inspired by the supplied visual:
- Battery health status, with source clearly separated into OS-reported health and capacity-based estimate.
- Battery chemistry/type only when the device exposes a reliable value; otherwise show unavailable rather than guessing.
- Observed charging-session count.
- Battery usage and charge/discharge history.
- Current charging state, charging duration, screen-on/off duration when available and permissioned, and percentage gained/lost during the measured session.
- Estimated time to full charge or depletion only when enough recent samples exist; show unavailable rather than inventing an ETA.
- Battery temperature and voltage with historical trend charts, min/max and current reading.
- Capacity/design capacity and wear estimate only when valid device data exists.
- Refresh efficiently on meaningful battery events and bounded sampling; no wasteful high-frequency polling.

### Accuracy rules
- Do not label foreground app usage as per-app battery consumption.
- Do not invent battery chemistry, session counts, health scores, voltage history or charge ETA when source data is missing.
- Distinguish current readings from historical samples and estimated values.
- Do not imply Android can stop charging or control hardware charging behaviour.
- Preserve null/unknown states rather than substituting demo data.

### Exit criteria
- Unit tests for derived metrics and sparse/missing samples.
- No fabricated metrics on devices that lack the underlying API.
- Verify graph continuity, time zones, charging transitions, app restart and history retention.

## Phase I — Android home-screen widgets and quick actions

- Add native Android home-screen widgets using a supported Android widget implementation (e.g. Jetpack Glance where compatible with the app's native build).
- Initial widget sizes: compact and expanded/resizable.
- Show battery percentage, charging/discharging state, temperature where available, and last-updated time.
- Offer safe quick actions such as opening Battery Monitor, opening charging alerts, and opening Anti-Theft settings.
- Consider an authenticated Anti-Theft arm/disarm action only after threat modelling; do not expose an unauthenticated one-tap disarm.
- Update on battery broadcasts and bounded scheduled refreshes; respect Android widget update limits and battery impact.
- Widget must display stale-data state if it cannot refresh. It must not promise continuous live updates or run the whole app persistently.
- Define widget empty, permission-restricted, stale, resize and multiple-instance states.

### Exit criteria
- Add/remove/resize/multiple-widget tests, reboot, app update, process death, battery state changes and low-power behaviour.
- Widget actions launch the correct destination and respect authentication.

## Phase J — Integrated UX, security and physical-device acceptance

- Unify onboarding, permission centre, dashboard, Battery Monitor, Anti-Theft, Settings and legal pages.
- Ensure no duplicate tabs or confusing navigation; support Android gesture/navigation safe areas.
- Accessibility: contrast, scalable text, touch targets, TalkBack labels and reduced motion.
- Security review: local secrets/PIN handling, biometric fallback, alarm stop actions, exported components, intent validation and notification actions.
- Performance review: battery impact, background work, database growth, memory and startup.
- Physical test matrix across Android API levels and at least representative OEM battery-management behaviours.
- Regression suite and release acceptance report.

## Phase K — Release candidate and distribution

- Signed production Android build, versioning, app identity, notification/widget assets and store listing.
- Review privacy disclosures, Data Safety form, foreground-service declarations and Play policy compliance.
- Legal text review; do not represent draft legal copy as legal advice or approved counsel.
- Final crash-free smoke tests, install/upgrade tests and rollback plan.
- Release candidate only after all mandatory acceptance criteria pass.

## Phase L — Launch monitoring and maintenance

- Crash/error and performance monitoring with privacy-minimizing telemetry.
- User feedback triage, production bug fixes and regression tests.
- Android OS/Expo/native dependency maintenance.
- Review battery impact and widget/service reliability after real-world use.
- Publish clear release notes and support guidance.

## Non-goals and explicit constraints

- No CSV or JSON export.
- No fake/demo telemetry or invented battery capabilities.
- No per-app mAh/energy attribution unless a legitimate platform API becomes available.
- No automatic charging stop or hardware charging control.
- No guarantee that anti-theft alarm survives force-stop, shutdown or every OEM restriction.
- No broad permission requests without a feature-specific and policy-compliant need.
- Android widgets are glance surfaces with OS-managed refresh, not continuously running app processes.

## Delivery order

Complete Phase E and merge the existing PR stack safely → Phase F onboarding/permissions → Phase G anti-theft → Phase H Battery Monitor → Phase I Android widgets → Phase J integration and device validation → Phase K release → Phase L maintenance.

Phases G and H may be developed on separate feature branches after Phase F, but integration and release acceptance remain gated by Phase J.
