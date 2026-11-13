package expo.modules.voltguardbattery

/** Pure recovery decisions shared by boot restoration and service startup. */
object AntiTheftRestorePolicy {
  fun shouldStartService(thresholdMonitoringEnabled: Boolean, antiTheftArmed: Boolean, alarmActive: Boolean): Boolean =
    thresholdMonitoringEnabled || antiTheftArmed || alarmActive

  fun shouldReportAntiTheftRestoreFailure(antiTheftArmed: Boolean, alarmActive: Boolean): Boolean =
    antiTheftArmed || alarmActive

  /** A failed first arm must not be reported as active; failed recovery preserves prior intent. */
  fun shouldClearNewArmAfterStartupFailure(newArmRequest: Boolean, alarmActive: Boolean): Boolean =
    newArmRequest && !alarmActive

  /** Anti-Theft is live only when the service and the persisted protection intent both exist. */
  fun isAntiTheftMonitoringActive(serviceRunning: Boolean, antiTheftArmed: Boolean, alarmActive: Boolean): Boolean =
    serviceRunning && (antiTheftArmed || alarmActive)
}
