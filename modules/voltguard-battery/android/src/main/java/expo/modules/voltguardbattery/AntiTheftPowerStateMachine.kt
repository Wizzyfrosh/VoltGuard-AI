package expo.modules.voltguardbattery

/**
 * Pure charger-state transitions for Anti-Theft. Android service timing,
 * persistence and notifications remain outside this class so transitions can
 * be verified deterministically on the JVM.
 */
data class AntiTheftPowerState(
  val armed: Boolean,
  val mode: String,
  val baselineConnected: Boolean,
  val alarmActive: Boolean
)

data class AntiTheftPowerTransition(
  val state: AntiTheftPowerState,
  val confirmDisconnect: Boolean
)

object AntiTheftPowerStateMachine {
  fun onPowerChanged(state: AntiTheftPowerState, plugged: Boolean): AntiTheftPowerTransition {
    if (!state.armed || state.alarmActive) {
      return AntiTheftPowerTransition(state, false)
    }
    if (plugged) {
      return AntiTheftPowerTransition(state.copy(baselineConnected = true), false)
    }
    return AntiTheftPowerTransition(state, state.baselineConnected)
  }

  fun onConfirmedDisconnect(state: AntiTheftPowerState): AntiTheftPowerState {
    require(state.armed) { "Anti-Theft must be armed to confirm a disconnect" }
    require(!state.alarmActive) { "The Anti-Theft alarm is already active" }
    require(state.baselineConnected) { "A charging connection must be observed before disconnecting" }
    require(state.mode == "one_time" || state.mode == "always") { "Invalid Anti-Theft mode" }
    return state.copy(
      armed = state.mode == "always",
      baselineConnected = false,
      alarmActive = true
    )
  }
}
