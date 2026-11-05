package expo.modules.voltguardbattery

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.location.LocationManager
import android.bluetooth.BluetoothAdapter
import android.nfc.NfcAdapter
import android.content.ContentResolver
import android.app.NotificationManager
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

    Function("getOptimizationDiagnostics") {
      readOptimizationDiagnostics()
    }

    Function("openOptimizationSetting") { setting: String ->
      val context = appContext.reactContext ?: return@Function false
      val action = when (setting) {
        "brightness" -> Settings.ACTION_DISPLAY_SETTINGS
        "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
        "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
        "nfc" -> "android.settings.NFC_SETTINGS"
        "sync" -> Settings.ACTION_SYNC_SETTINGS
        else -> null
      } ?: return@Function false
      try {
        context.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
      } catch (_: Exception) { false }
    }

    Function("getChargingAlarmStatus") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      VoltGuardBatteryNotifications.getChargingAlarmStatus(context)
    }

    Function("sendTestChargingAlarm") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      VoltGuardBatteryNotifications.postTestAlarm(context)
    }

    AsyncFunction("startBackgroundMonitoring") { threshold: Int ->
      require(threshold in 50..100) { "Threshold must be between 50 and 100" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      VoltGuardBatteryNotifications.createChannels(context)
      val alarmStatus = VoltGuardBatteryNotifications.getChargingAlarmStatus(context)
      if (alarmStatus["alarmReady"] != true) {
        throw IllegalStateException(VoltGuardBatteryNotifications.describeAlarmStatus(alarmStatus))
      }
      val serviceIntent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
        action = VoltGuardBatteryMonitorService.ACTION_START
        putExtra(VoltGuardBatteryMonitorService.EXTRA_THRESHOLD, threshold)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(serviceIntent)
      else context.startService(serviceIntent)
      Unit
    }

    AsyncFunction("stopBackgroundMonitoring") {
      appContext.reactContext?.let { context ->
        val serviceIntent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
          action = VoltGuardBatteryMonitorService.ACTION_STOP
        }
        context.startService(serviceIntent)
      }
      Unit
    }
  }

  private fun readOptimizationDiagnostics(): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val resolver = context.contentResolver
    val locationEnabled = try {
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      manager?.isLocationEnabled
    } catch (_: Exception) { null }
    val automaticBrightnessEnabled = try {
      Settings.System.getInt(resolver, Settings.System.SCREEN_BRIGHTNESS_MODE) == Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC
    } catch (_: Exception) { null }
    val bluetoothEnabled = try {
      @Suppress("DEPRECATION")
      BluetoothAdapter.getDefaultAdapter()?.isEnabled
    } catch (_: Exception) { null }
    val nfcEnabled = try {
      NfcAdapter.getDefaultAdapter(context)?.isEnabled
    } catch (_: Exception) { null }
    val masterSyncEnabled = try {
      ContentResolver.getMasterSyncAutomatically()
    } catch (_: Exception) { null }
    return mapOf(
      "locationEnabled" to locationEnabled,
      "automaticBrightnessEnabled" to automaticBrightnessEnabled,
      "bluetoothEnabled" to bluetoothEnabled,
      "nfcEnabled" to nfcEnabled,
      "masterSyncEnabled" to masterSyncEnabled
    )
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

    val technology = batteryIntent
      ?.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY)
      ?.takeIf { it.isNotBlank() }

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
      "cycleCount" to cycleCount,
      "technology" to technology
    )
  }
}
