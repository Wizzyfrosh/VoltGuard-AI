package expo.modules.voltguardbattery

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AntiTheftPinLockoutTest {
  @Test fun failuresOneThroughFourDoNotLock() {
    var state = AntiTheftLockoutState(0, 0L)
    repeat(4) { index ->
      val result = AntiTheftPinLockout.recordFailure(state, 10_000L + index)
      assertFalse(result.locked)
      state = result.state
      assertEquals(index + 1, state.failedAttempts)
    }
  }

  @Test fun fifthFailureStartsSixtySecondLockout() {
    var state = AntiTheftLockoutState(0, 0L)
    repeat(4) { index -> state = AntiTheftPinLockout.recordFailure(state, 20_000L + index).state }
    val result = AntiTheftPinLockout.recordFailure(state, 20_100L)
    assertTrue(result.locked)
    assertEquals(0, result.state.failedAttempts)
    assertEquals(80_100L, result.state.lockedUntilEpochMs)
  }

  @Test fun lockoutRemainsActiveUntilExpiry() {
    val state = AntiTheftLockoutState(0, 70_000L)
    assertTrue(AntiTheftPinLockout.isLocked(state, 69_999L))
    assertFalse(AntiTheftPinLockout.isLocked(state, 70_000L))
  }

  @Test fun failuresDuringLockoutDoNotExtendOrChangeLockout() {
    val state = AntiTheftLockoutState(0, 90_000L)
    val result = AntiTheftPinLockout.recordFailure(state, 50_000L)
    assertTrue(result.locked)
    assertEquals(state, result.state)
  }

  @Test fun failureAfterExpiryStartsFreshCounter() {
    val state = AntiTheftLockoutState(0, 90_000L)
    val result = AntiTheftPinLockout.recordFailure(state, 90_000L)
    assertFalse(result.locked)
    assertEquals(1, result.state.failedAttempts)
    assertEquals(0L, result.state.lockedUntilEpochMs)
  }

  @Test fun successfulVerificationCanClearLockoutState() {
    assertEquals(AntiTheftLockoutState(0, 0L), AntiTheftPinLockout.clear())
  }
}
