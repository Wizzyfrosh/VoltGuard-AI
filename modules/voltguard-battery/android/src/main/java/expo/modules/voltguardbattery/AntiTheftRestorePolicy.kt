package expo.modules.voltguardbattery

/** Pure recovery decisions shared by boot restoration and service startup. */
object AntiTheftRestorePolicy {
  fun shouldStartService(thresholdMonitoringEnabled: Boolean, antiTheftArmed: Boolean, alarmActive: Boolean): Boolean =
    thresholdMonitoringEnabled || antiTheftArmed || alarmActive

  fun shouldReportAntiTheftRestoreFailure(antiTheftArmed: Boolean, alarmActive: Boolean): Boolean =
    antiTheftArmed || alarmActive
}
