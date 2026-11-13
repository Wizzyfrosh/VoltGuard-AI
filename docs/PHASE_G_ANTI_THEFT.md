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
- Added Phase G push and pull-request CI triggers.

## Required engineering work still open
- Add automated tests for One-Time and Always state transitions, delay cancellation, process recreation and PIN lockout. Current mode behavior is implemented but not verified by tests.
- Make alarm playback lifecycle robust across process/service recreation; evaluate audio focus, asynchronous media preparation and wake behaviour on real Android hardware.
- Add optional user-configurable vibration, time-bounded camera flash and biometric unlock only after the core alarm/disarm lifecycle is stable.
- Add unit/state-machine tests for charger transitions, repeated broadcasts, mode semantics, lockout, alarm persistence, and reboot restoration.
- Validate manifest/foreground-service policy and notification permission/channel readiness.
- Run TypeScript, unit tests, lint, Expo export, and Android Kotlin compile against the exact branch head. A Vercel pending status is not a substitute for GitHub Actions validation.
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
