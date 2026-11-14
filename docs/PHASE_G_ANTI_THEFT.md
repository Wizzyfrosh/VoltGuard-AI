# Phase G — Android Anti-Theft

**Branch:** `phase-g/anti-theft`  
**Status:** Native implementation and CI build validation passed; physical-device acceptance and dependency-security remediation remain open.

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
- Added a pure charger-state machine and 10 JVM JUnit tests covering unarmed events, baseline connection, One-Time/Always disconnect transitions, reconnect state, active alarm suppression, and invalid transitions.
- Extracted PIN lockout policy into a deterministic component and added 6 JVM JUnit tests for attempt thresholds, 60-second expiry, attempts during lockout, fresh counters after expiry, and successful reset.
- AndroidX BiometricPrompt is integrated using the Expo host activity when it is a FragmentActivity; the native module exposes strong-biometric availability and PIN fallback. Confirm the generated Expo/RN host activity type during the Android prebuild and retain the PIN path on unsupported hosts.
- Added service-restart recovery handling: if Android rejects a foreground-service restart, Anti-Theft armed/alarm state is preserved and a restore-failed status is exposed to the app instead of silently clearing protection state.
- Recreate the Anti-Theft alarm notification and restart alarm audio when the service is successfully restored with a persisted active alarm.
- Make alarm playback lifecycle robust across process/service recreation; evaluate audio focus, asynchronous media preparation and wake behaviour on real Android hardware.
- Optional time-bounded camera flash is implemented with runtime camera permission, hardware detection, and automatic timeout; verify torch behaviour and cleanup on supported physical devices.
- Validate biometric prompt lifecycle on a real Android device, including cancellation, lockout, activity recreation, and PIN fallback.
- Add tests for service-level delay scheduling/cancellation, repeated broadcasts, persisted alarm restoration, boot receiver failure handling and reboot restoration. Current unit tests cover pure policy/state transitions, not Android service execution.
- Validate manifest/foreground-service policy and notification permission/channel readiness.
- CI run `43527849291` passed TypeScript, application unit tests, lint, Expo web export, Expo Android prebuild, Android JVM unit tests, and `:app:assembleDebug` on the then-current Phase G head (`15da389`). The Android native job completed successfully. This validates compilation and APK assembly only; it does not prove runtime behaviour on a physical device.
- Perform physical Android testing for plug/unplug, screen off, notification denial, sound/DND, service process recreation, reboot, OEM battery management, biometric prompt lifecycle, camera permission revocation, torch timeout, and PIN lockout.

## Security and platform constraints
- The PIN is not stored in plaintext. The verifier is encrypted using an Android Keystore AES-GCM key; device credential/key invalidation requires a safe recovery/reset flow before release.
- PIN derivation and verification run off the UI thread.
- Do not claim theft-proof protection. Android force-stop, power-off, battery restrictions, OS policy, notification denial, or hardware/OEM behaviour can interrupt monitoring or sound. A failed boot/service restart is surfaced to the user; preserving settings does not mean Android is currently monitoring.
- Strong-biometric disarming is exposed through AndroidX BiometricPrompt when the current host is a FragmentActivity; the Anti-Theft PIN remains available as fallback. Do not mark biometrics release-ready until prompt lifecycle and device compatibility are physically tested.
- Trigger delay, optional flash and vibration are implemented. User-selectable alarm sound remains out of scope for this phase.
- One-Time mode must arm for the next detected connected charging session and disarm after its disconnect alarm. Always mode must remain armed until PIN-confirmed manual disarm.

## Release gate
This PR is a feature-development branch, not a release candidate. The Android build, JVM tests, TypeScript, application tests, lint and web export passed in CI run `43527849291`; the separate production dependency audit failed. Do not merge until dependency vulnerabilities are remediated or formally assessed, security review is complete, physical Android acceptance is recorded, and Phase F's Android permission acceptance is completed.
