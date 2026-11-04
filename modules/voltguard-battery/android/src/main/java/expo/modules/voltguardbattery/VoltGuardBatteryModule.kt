package expo.modules.voltguardbattery

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VoltGuardBatteryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VoltGuardBattery")

    Function("getBatteryDiagnostics") {
      readBatteryDiagnostics()
    }

    AsyncFunction("startBackgroundMonitoring") { threshold: Int ->
      require(threshold in 50..100) { "Threshold must be between 50 and 100" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val serviceIntent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
        action = VoltGuardBatteryMonitorService.ACTION_START
        putExtra(VoltGuardBatteryMonitorService.EXTRA_THRESHOLD, threshold)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(serviceIntent)
      else context.startService(serviceIntent)
    }

    AsyncFunction("stopBackgroundMonitoring") {
      appContext.reactContext?.let { context ->
        val serviceIntent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
          action = VoltGuardBatteryMonitorService.ACTION_STOP
        }
        context.startService(serviceIntent)
      }
    }
  }

  private fun readBatteryDiagnostics(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
      ?: return null

    val batteryIntent: Intent? = try {
      @Suppress("DEPRECATION")
      context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (_: Exception) {
      null
    }

    fun intProperty(property: Int): Int? {
      return try {
        val value = manager.getIntProperty(property)
        if (value == Int.MIN_VALUE) null else value
      } catch (_: Exception) {
        null
      }
    }

    val voltageMilliVolts = batteryIntent
      ?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1)
      ?.takeIf { it > 0 }

    val temperatureTenthsCelsius = batteryIntent
      ?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
      ?.takeIf { it != Int.MIN_VALUE && it in -500..1500 }

    val rawHealth = batteryIntent?.getIntExtra(BatteryManager.EXTRA_HEALTH, -1) ?: -1
    val health = when (rawHealth) {
      BatteryManager.BATTERY_HEALTH_GOOD -> "good"
      BatteryManager.BATTERY_HEALTH_OVERHEAT -> "overheat"
      BatteryManager.BATTERY_HEALTH_DEAD -> "dead"
      BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "over-voltage"
      BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "failure"
      BatteryManager.BATTERY_HEALTH_COLD -> "cold"
      else -> null
    }

    val rawStatus = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
    val status = when (rawStatus) {
      BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
      BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "not-charging"
      BatteryManager.BATTERY_STATUS_FULL -> "full"
      else -> "unknown"
    }

    val rawPlugged = batteryIntent?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
    val plugged = when (rawPlugged) {
      BatteryManager.BATTERY_PLUGGED_AC -> "ac"
      BatteryManager.BATTERY_PLUGGED_USB -> "usb"
      BatteryManager.BATTERY_PLUGGED_WIRELESS -> "wireless"
      else -> "none-or-unknown"
    }

    val currentNowMicroAmps = intProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)
    val currentAverageMicroAmps = intProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_AVERAGE)
    val propertyCapacityPercent = intProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
      ?.takeIf { it in 0..100 }
    val intentLevel = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val intentScale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
    val intentCapacityPercent = if (intentLevel >= 0 && intentScale > 0) {
      (intentLevel * 100f / intentScale).toInt().coerceIn(0, 100)
    } else {
      null
    }
    // BatteryManager's capacity property is preferred; the sticky battery intent
    // is the standard fallback on devices that do not implement that property.
    val capacityPercent = propertyCapacityPercent ?: intentCapacityPercent
    val chargeCounterMicroAmpHours = intProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER)
      ?.takeIf { it >= 0 }

    val energyCounterNanoWattHours = try {
      manager.getLongProperty(BatteryManager.BATTERY_PROPERTY_ENERGY_COUNTER)
        .takeIf { it >= 0L }
    } catch (_: Exception) {
      null
    }

    val cycleCount = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      batteryIntent
        ?.getIntExtra(BatteryManager.EXTRA_CYCLE_COUNT, -1)
        ?.takeIf { it >= 0 }
    } else {
      null
    }

    return mapOf(
      "apiLevel" to Build.VERSION.SDK_INT,
      "voltageMilliVolts" to voltageMilliVolts,
      "temperatureTenthsCelsius" to temperatureTenthsCelsius,
      "health" to health,
      "status" to status,
      "plugged" to plugged,
      "capacityPercent" to capacityPercent,
      "currentNowMicroAmps" to currentNowMicroAmps,
      "currentAverageMicroAmps" to currentAverageMicroAmps,
      "chargeCounterMicroAmpHours" to chargeCounterMicroAmpHours,
      "energyCounterNanoWattHours" to energyCounterNanoWattHours,
      "cycleCount" to cycleCount
    )
  }
}
