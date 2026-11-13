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
}
