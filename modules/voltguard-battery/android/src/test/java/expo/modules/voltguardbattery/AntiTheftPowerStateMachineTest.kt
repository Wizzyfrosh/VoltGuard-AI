package expo.modules.voltguardbattery

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AntiTheftPowerStateMachineTest {
  @Test fun unarmedDeviceDoesNotTriggerOnDisconnect() {
    val state = AntiTheftPowerState(false, "one_time", true, false)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, false)
    assertFalse(result.confirmDisconnect)
    assertEquals(state, result.state)
  }

  @Test fun firstConnectionEstablishesBaselineWithoutAlarm() {
    val state = AntiTheftPowerState(true, "one_time", false, false)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, true)
    assertFalse(result.confirmDisconnect)
    assertTrue(result.state.baselineConnected)
  }

  @Test fun disconnectRequiresPreviouslyObservedConnection() {
    val state = AntiTheftPowerState(true, "always", false, false)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, false)
    assertFalse(result.confirmDisconnect)
  }

  @Test fun connectedThenDisconnectedRequestsConfirmation() {
    val state = AntiTheftPowerState(true, "always", true, false)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, false)
    assertTrue(result.confirmDisconnect)
    assertEquals(state, result.state)
  }

  @Test fun oneTimeModeDisarmsAfterConfirmedDisconnect() {
    val state = AntiTheftPowerState(true, "one_time", true, false)
    val result = AntiTheftPowerStateMachine.onConfirmedDisconnect(state)
    assertFalse(result.armed)
    assertFalse(result.baselineConnected)
    assertTrue(result.alarmActive)
  }

  @Test fun alwaysModeRemainsArmedAfterConfirmedDisconnect() {
    val state = AntiTheftPowerState(true, "always", true, false)
    val result = AntiTheftPowerStateMachine.onConfirmedDisconnect(state)
    assertTrue(result.armed)
    assertFalse(result.baselineConnected)
    assertTrue(result.alarmActive)
  }

  @Test fun reconnectWhileArmedResetsPendingDisconnectCondition() {
    val state = AntiTheftPowerState(true, "always", true, false)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, true)
    assertFalse(result.confirmDisconnect)
    assertTrue(result.state.baselineConnected)
  }

  @Test fun activeAlarmIgnoresFurtherPowerEvents() {
    val state = AntiTheftPowerState(true, "always", false, true)
    val result = AntiTheftPowerStateMachine.onPowerChanged(state, false)
    assertFalse(result.confirmDisconnect)
    assertEquals(state, result.state)
  }

  @Test fun invalidModeCannotConfirmDisconnect() {
    val state = AntiTheftPowerState(true, "unknown", true, false)
    try {
      AntiTheftPowerStateMachine.onConfirmedDisconnect(state)
      throw AssertionError("Expected invalid mode to be rejected")
    } catch (_: IllegalArgumentException) {
      // Expected.
    }
  }

  @Test fun alreadyDisarmedStateCannotConfirmDisconnect() {
    val state = AntiTheftPowerState(false, "one_time", true, false)
    try {
      AntiTheftPowerStateMachine.onConfirmedDisconnect(state)
      throw AssertionError("Expected disarmed state to be rejected")
    } catch (_: IllegalArgumentException) {
      // Expected.
    }
  }
}
