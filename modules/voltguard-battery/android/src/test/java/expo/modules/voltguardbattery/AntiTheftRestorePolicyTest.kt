package expo.modules.voltguardbattery

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AntiTheftRestorePolicyTest {
  @Test fun noEnabledFeaturesDoNotStartService() {
    assertFalse(AntiTheftRestorePolicy.shouldStartService(false, false, false))
  }
  @Test fun thresholdMonitoringRequestsRestore() {
    assertTrue(AntiTheftRestorePolicy.shouldStartService(true, false, false))
  }
  @Test fun armedProtectionRequestsRestore() {
    assertTrue(AntiTheftRestorePolicy.shouldStartService(false, true, false))
  }
  @Test fun activeAlarmRequestsRestoreEvenWhenProtectionIsNotArmed() {
    assertTrue(AntiTheftRestorePolicy.shouldStartService(false, false, true))
  }
  @Test fun restoreFailureIsReportedForArmedProtection() {
    assertTrue(AntiTheftRestorePolicy.shouldReportAntiTheftRestoreFailure(true, false))
  }
  @Test fun restoreFailureIsReportedForAnActiveAlarm() {
    assertTrue(AntiTheftRestorePolicy.shouldReportAntiTheftRestoreFailure(false, true))
  }
  @Test fun thresholdOnlyFailureDoesNotClaimAntiTheftFailure() {
    assertFalse(AntiTheftRestorePolicy.shouldReportAntiTheftRestoreFailure(false, false))
  }
  @Test fun failedInitialArmIsNotReportedAsArmed() {
    assertTrue(AntiTheftRestorePolicy.shouldClearNewArmAfterStartupFailure(true, false))
  }
  @Test fun failedBootRecoveryPreservesArmedIntent() {
    assertFalse(AntiTheftRestorePolicy.shouldClearNewArmAfterStartupFailure(false, false))
  }
  @Test fun failedAlarmRecoveryPreservesAlarmState() {
    assertFalse(AntiTheftRestorePolicy.shouldClearNewArmAfterStartupFailure(true, true))
  }
  @Test fun persistedArmedFlagWithoutLiveServiceIsNotMonitoring() {
    assertFalse(AntiTheftRestorePolicy.isAntiTheftMonitoringActive(false, true, false))
  }
  @Test fun liveServiceWithoutAntiTheftIntentIsNotAntiTheftMonitoring() {
    assertFalse(AntiTheftRestorePolicy.isAntiTheftMonitoringActive(true, false, false))
  }
  @Test fun liveServiceAndArmedIntentAreMonitoring() {
    assertTrue(AntiTheftRestorePolicy.isAntiTheftMonitoringActive(true, true, false))
  }
  @Test fun liveServiceAndActiveAlarmAreMonitoring() {
    assertTrue(AntiTheftRestorePolicy.isAntiTheftMonitoringActive(true, false, true))
  }
}
