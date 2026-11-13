package expo.modules.voltguardbattery

data class AntiTheftLockoutState(
  val failedAttempts: Int,
  val lockedUntilEpochMs: Long
)

data class AntiTheftLockoutResult(
  val state: AntiTheftLockoutState,
  val locked: Boolean
)

/** Deterministic lockout policy; persistence and wall-clock access stay at the caller. */
object AntiTheftPinLockout {
  const val MAX_ATTEMPTS = 5
  const val LOCKOUT_DURATION_MS = 60_000L

  fun isLocked(state: AntiTheftLockoutState, nowEpochMs: Long): Boolean =
    nowEpochMs < state.lockedUntilEpochMs

  fun recordFailure(state: AntiTheftLockoutState, nowEpochMs: Long): AntiTheftLockoutResult {
    if (isLocked(state, nowEpochMs)) return AntiTheftLockoutResult(state, true)
    val attempts = state.failedAttempts.coerceAtLeast(0) + 1
    return if (attempts >= MAX_ATTEMPTS) {
      AntiTheftLockoutResult(
        AntiTheftLockoutState(0, nowEpochMs + LOCKOUT_DURATION_MS),
        true
      )
    } else {
      AntiTheftLockoutResult(AntiTheftLockoutState(attempts, 0L), false)
    }
  }

  fun clear(): AntiTheftLockoutState = AntiTheftLockoutState(0, 0L)
}
