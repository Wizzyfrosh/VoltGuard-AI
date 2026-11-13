# Phase G — Android Anti-Theft

**Branch:** `phase-g/anti-theft`  
**Status:** Initial implementation in progress; not signed off.

## Implemented in source
- Added an Android Keystore-backed AES-GCM encrypted PIN verifier with a per-PIN random salt, PBKDF2-HMAC-SHA256 (210,000 iterations), constant-time comparison, and a five-attempt / 60-second lockout.
- Added native bridge methods to configure the PIN, arm One-Time or Always mode, read local state, and disarm after PIN verification.
- Extended the existing battery foreground service rather than introducing a second competing service.
- Added charger-connection baseline detection and disconnect-triggered alarm notification/audio.
- Added configurable 0/5/10/15/30-second disconnect confirmation delay; the pending trigger is cancelled if power reconnects and rechecked against Android's current sticky battery state before alarm activation.
- Anti-Theft arming now verifies notification permission and that the alarm channel is enabled with sound/high importance; service-start failure rolls back the persisted armed state.
- Added a dedicated high-importance Anti-Theft notification channel and branded notification.
- Added a native Anti-Theft screen and Settings entry.
- Added optional repeating vibration with device capability detection and a persisted user preference.
- Hardened PIN changes so credentials cannot be replaced while protection or an alarm is active.
- Made PIN record and lockout-counter persistence synchronous, so a process termination cannot silently discard a newly recorded failed attempt or lockout.
- Added Phase G push and pull-request CI triggers.

## Required engineering work still open
- Added a pure charger-state machine and JVM JUnit tests covering unarmed events, baseline connection, One-Time/Always disconnect transitions, reconnect state, active alarm suppression, and invalid transitions. Delay scheduling/cancellation, process recreation and PIN lockout still need dedicated tests.
- Add AndroidX BiometricPrompt only after the host Activity/dependency setup is verified. The current repository does not expose a configured biometric dependency or app Android host project in source; do not ship a UI-only or simulated biometric fallback.
- Make alarm playback lifecycle robust across process/service recreation; evaluate audio focus, asynchronous media preparation and wake behaviour on real Android hardware.
- Add time-bounded camera flash after runtime permission and hardware capability handling are implemented. Camera permission is intentionally not requested yet.
- Add biometric unlock with PIN fallback after AndroidX BiometricPrompt integration and host Activity lifecycle validation.
- Add unit/state-machine tests for charger transitions, repeated broadcasts, mode semantics, lockout, alarm persistence, and reboot restoration.
- Validate manifest/foreground-service policy and notification permission/channel readiness.
- Run TypeScript, unit tests, lint, Expo export, Android JVM unit tests and Android Kotlin compile against the exact branch head. A Vercel pending status is not a substitute for GitHub Actions validation.
- Perform physical Android testing for plug/unplug, screen off, notification denial, sound/DND, service process recreation, reboot, OEM battery management, and PIN lockout.

## Security and platform constraints
- The PIN is not stored in plaintext. The verifier is encrypted using an Android Keystore AES-GCM key; device credential/key invalidation requires a safe recovery/reset flow before release.
- PIN derivation and verification run off the UI thread.
- Do not claim theft-proof protection. Android force-stop, power-off, battery restrictions, OS policy, notification denial, or hardware/OEM behaviour can interrupt monitoring or sound.
- No biometric API is exposed yet. Do not advertise biometrics until implemented and tested.
- Trigger delay, flash and user-selectable alarm sound are not implemented yet.
- One-Time mode must arm for the next detected connected charging session and disarm after its disconnect alarm. Always mode must remain armed until PIN-confirmed manual disarm.

## Release gate
This PR is a feature-development branch, not a release candidate. Do not merge until CI is green, security review is complete, physical Android acceptance is recorded, and Phase F's Android permission acceptance is completed. Dependency audit remains a separate production gate.
