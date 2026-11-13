package expo.modules.voltguardbattery

import androidx.fragment.app.FragmentActivity
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.location.LocationManager
import android.bluetooth.BluetoothAdapter
import android.nfc.NfcAdapter
import android.content.ContentResolver
import android.app.NotificationManager
import android.app.ActivityManager
import android.os.Environment
import android.os.StatFs
import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.os.Process
import android.os.BatteryManager
import android.os.Vibrator
import android.os.VibratorManager
import android.os.Build
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class VoltGuardBatteryModule : Module() {
  // Keep rendered launcher icons in memory so a manual refresh does not repeatedly
  // decode Drawables, allocate Bitmaps and Base64-encode the same package icons.
  private val appDetailsCache = LruCache<String, Pair<String, String?>>(40)
  override fun definition() = ModuleDefinition {
    Name("VoltGuardBattery")

    Function("getBatteryDiagnostics") {
      readBatteryDiagnostics()
    }

    Function("getOptimizationDiagnostics") {
      readOptimizationDiagnostics()
    }

    AsyncFunction("hasUsageAccess") Coroutine { ->
      withContext(Dispatchers.IO) { hasUsageAccess() }
    }

    Function("openUsageAccessSettings") {
      val context = appContext.reactContext ?: return@Function false
      try {
        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
      } catch (_: Exception) { false }
    }

    AsyncFunction("getAppUsageStats") Coroutine { ->
      withContext(Dispatchers.IO) { readAppUsageStats() }
    }

    AsyncFunction("getSystemResourceDiagnostics") Coroutine { ->
      withContext(Dispatchers.IO) { readSystemResourceDiagnostics() }
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

    Function("hasAntiTheftPin") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      VoltGuardAntiTheftSecurity.hasPin(context)
    }

    AsyncFunction("setAntiTheftPin") Coroutine { pin: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      withContext(Dispatchers.Default) {
        VoltGuardAntiTheftSecurity.setPin(context, pin)
        true
      }
    }

    Function("armAntiTheft") { mode: String ->
      require(mode == "one_time" || mode == "always") { "Invalid Anti-Theft mode" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      require(VoltGuardAntiTheftSecurity.hasPin(context)) { "Set an Anti-Theft PIN before arming protection" }
      VoltGuardBatteryNotifications.createChannels(context)
      val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      require(notifications.areNotificationsEnabled()) {
        "Enable VoltGuard notifications before arming Anti-Theft protection"
      }
      val alarmChannel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        notifications.getNotificationChannel(VoltGuardBatteryNotifications.ANTI_THEFT_CHANNEL_ID)
      } else null
      require(Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
        (alarmChannel != null && alarmChannel.importance >= NotificationManager.IMPORTANCE_HIGH && alarmChannel.sound != null)) {
        "Enable sound and High importance for the Anti-Theft alarm in Android notification settings"
      }
      val preferences = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
      // Persist the requested state before returning to JS so an immediate
      // status refresh cannot race the asynchronous Android service start.
      preferences.edit()
        .putBoolean("anti_theft_enabled", true)
        .putBoolean("anti_theft_alarm_active", false)
        .putString("anti_theft_mode", mode)
        .putBoolean("anti_theft_baseline_connected", false)
        .apply()
      val intent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
        action = VoltGuardBatteryMonitorService.ACTION_ANTI_THEFT_START
        putExtra(VoltGuardBatteryMonitorService.EXTRA_ANTI_THEFT_MODE, mode)
      }
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
        else context.startService(intent)
      } catch (error: Exception) {
        preferences.edit()
          .putBoolean("anti_theft_enabled", false)
          .putBoolean("anti_theft_alarm_active", false)
          .putBoolean("anti_theft_baseline_connected", false)
          .apply()
        throw IllegalStateException("Android could not start Anti-Theft monitoring. Check battery and background activity restrictions.", error)
      }
      true
    }

    AsyncFunction("disarmAntiTheftWithBiometric") Coroutine { ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val activity = appContext.currentActivity as? FragmentActivity
        ?: throw IllegalStateException("The Android activity is unavailable. Use your Anti-Theft PIN instead.")
      require(VoltGuardAntiTheftSecurity.hasPin(context)) { "Anti-Theft PIN is not configured" }
      require(VoltGuardAntiTheftBiometric.isAvailable(activity)) {
        "Strong biometric authentication is unavailable. Use your Anti-Theft PIN instead."
      }
      val authenticated = withContext(Dispatchers.Main.immediate) {
        VoltGuardAntiTheftBiometric.authenticate(activity)
      }
      if (!authenticated) return@Coroutine false
      requestAntiTheftDisarm(context)
      true
    }

    AsyncFunction("disarmAntiTheft") Coroutine { pin: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      withContext(Dispatchers.Default) {
        require(VoltGuardAntiTheftSecurity.hasPin(context)) { "Anti-Theft PIN is not configured" }
        if (!VoltGuardAntiTheftSecurity.verifyPin(context, pin)) {
          throw IllegalArgumentException("Incorrect Anti-Theft PIN")
        }
      }
      // The native state is committed before returning, so the next status
      // refresh cannot race the asynchronous service command.
      requestAntiTheftDisarm(context)
      true
    }

    Function("setAntiTheftFlash") { enabled: Boolean ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val prefs = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
      require(!prefs.getBoolean("anti_theft_alarm_active", false)) {
        "Silence the active alarm before changing flash settings"
      }
      if (enabled) {
        require(VoltGuardAntiTheftFlash.isAvailable(context)) { "This device does not have a supported rear camera flash" }
      }
      prefs.edit().putBoolean("anti_theft_flash_enabled", enabled).commit().also {
        check(it) { "Could not save Anti-Theft flash preference" }
      }
      true
    }

    Function("setAntiTheftVibration") { enabled: Boolean ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val prefs = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
      require(!prefs.getBoolean("anti_theft_alarm_active", false)) {
        "Silence the active alarm before changing vibration settings"
      }
      prefs.edit().putBoolean("anti_theft_vibration_enabled", enabled).apply()
      true
    }

    Function("setAntiTheftDelay") { seconds: Int ->
      require(seconds in 0..30) { "Disconnect delay must be between 0 and 30 seconds" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val prefs = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
      require(!prefs.getBoolean("anti_theft_enabled", false) &&
        !prefs.getBoolean("anti_theft_alarm_active", false)) {
        "Disarm Anti-Theft before changing the disconnect delay"
      }
      prefs.edit().putInt("anti_theft_delay_seconds", seconds).apply()
      true
    }

    Function("getAntiTheftStatus") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
      val prefs = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
      mapOf(
        "pinConfigured" to VoltGuardAntiTheftSecurity.hasPin(context),
        "armed" to prefs.getBoolean("anti_theft_enabled", false),
        "alarmActive" to prefs.getBoolean("anti_theft_alarm_active", false),
        "restoreFailed" to prefs.getBoolean("anti_theft_restore_failed", false),
        "mode" to prefs.getString("anti_theft_mode", "one_time"),
        "delaySeconds" to prefs.getInt("anti_theft_delay_seconds", 5),
        "vibrationEnabled" to prefs.getBoolean("anti_theft_vibration_enabled", true),
        "flashEnabled" to prefs.getBoolean("anti_theft_flash_enabled", false),
        "flashAvailable" to VoltGuardAntiTheftFlash.hasFlashHardware(context),
        "biometricAvailable" to (appContext.currentActivity as? FragmentActivity)?.let { VoltGuardAntiTheftBiometric.isAvailable(it) } ?: false,
        "vibrationAvailable" to try {
          val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
          } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
          }
          vibrator.hasVibrator()
        } catch (_: Exception) { false }
      )
    }

    AsyncFunction("stopBackgroundMonitoring") {
      appContext.reactContext?.let { context ->
        VoltGuardBatteryMonitorService.stop(context)
      }
      Unit
    }
  }

  private fun readSystemResourceDiagnostics(): Map<String, Any?> {
    val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
    val memory = try {
      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      ActivityManager.MemoryInfo().also { activityManager.getMemoryInfo(it) }
    } catch (_: Exception) { null }
    val storage = try {
      StatFs(Environment.getDataDirectory().path)
    } catch (_: Exception) { null }
    return mapOf(
      "totalRamBytes" to memory?.totalMem,
      "availableRamBytes" to memory?.availMem,
      "lowMemory" to memory?.lowMemory,
      "totalStorageBytes" to storage?.totalBytes,
      "availableStorageBytes" to storage?.availableBytes
    )
  }

  private fun hasUsageAccess(): Boolean {
    val context = appContext.reactContext
      ?: throw IllegalStateException("React context is unavailable")
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      ?: throw IllegalStateException("Android AppOps service is unavailable")
    @Suppress("DEPRECATION")
    return appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName
    ) == AppOpsManager.MODE_ALLOWED
  }

  private fun readAppUsageStats(): Map<String, Any?> {
    val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")
    if (!hasUsageAccess()) {
      return mapOf("permissionGranted" to false, "windowStart" to 0L, "windowEnd" to 0L, "apps" to emptyList<Map<String, Any?>>())
    }
    val end = System.currentTimeMillis()
    val start = end - 24L * 60L * 60L * 1000L
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return mapOf(
        "permissionGranted" to true,
        "queryAvailable" to false,
        "windowStart" to start,
        "windowEnd" to end,
        "apps" to emptyList<Map<String, Any?>>()
      )
    val stats = try {
      manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
    } catch (_: Exception) { null }
    if (stats == null) {
      return mapOf(
        "permissionGranted" to true,
        "queryAvailable" to false,
        "windowStart" to start,
        "windowEnd" to end,
        "apps" to emptyList<Map<String, Any?>>()
      )
    }
    val ownPackage = context.packageName
    // Aggregate and rank usage before resolving package metadata or rendering icons.
    // Icon rendering is comparatively expensive; doing it for every package returned
    // by UsageStatsManager creates unnecessary work on every refresh.
    // Fold daily UsageStats rows directly into primitive accumulators.
    // groupBy() would allocate a List for every package on each refresh.
    val usageByPackage = HashMap<String, LongArray>()
    for (row in stats) {
      if (row.packageName == ownPackage || row.totalTimeInForeground <= 0L) continue
      val totals = usageByPackage.getOrPut(row.packageName) { longArrayOf(0L, 0L) }
      totals[0] += row.totalTimeInForeground
      if (row.lastTimeUsed > totals[1]) totals[1] = row.lastTimeUsed
    }
    val topUsage = usageByPackage
      .map { (packageName, totals) -> Triple(packageName, totals[0], totals[1]) }
      .sortedByDescending { it.second }
      .take(20)

    val apps = topUsage.map { (packageName, foregroundMs, lastUsed) ->
      val appDetails = try {
        @Suppress("DEPRECATION")
        val packageInfo = context.packageManager.getPackageInfo(packageName, 0)
        val appInfo = packageInfo.applicationInfo
          ?: throw IllegalStateException("Application metadata is unavailable")
        // Package update time changes when an app is upgraded, so a cached
        // launcher icon/label cannot outlive the installed app version.
        val cacheKey = "$packageName:${packageInfo.lastUpdateTime}"
        synchronized(appDetailsCache) { appDetailsCache.get(cacheKey) } ?: run {
          val label = context.packageManager.getApplicationLabel(appInfo).toString()
          val iconDataUri = try {
            val drawable = context.packageManager.getApplicationIcon(appInfo)
            val bitmap = Bitmap.createBitmap(72, 72, Bitmap.Config.ARGB_8888)
            try {
              val canvas = Canvas(bitmap)
              drawable.setBounds(0, 0, canvas.width, canvas.height)
              drawable.draw(canvas)
              ByteArrayOutputStream().use { output ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
                "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
              }
            } finally {
              bitmap.recycle()
            }
          } catch (_: Exception) { null }
          (label to iconDataUri).also { details ->
            synchronized(appDetailsCache) { appDetailsCache.put(cacheKey, details) }
          }
        }
      } catch (_: Exception) {
        (packageName to null)
      }
      mapOf(
        "packageName" to packageName,
        "appLabel" to appDetails.first,
        "iconDataUri" to appDetails.second,
        "foregroundTimeMs" to foregroundMs,
        "lastTimeUsed" to lastUsed
      )
    }
    return mapOf(
      "permissionGranted" to true,
      "queryAvailable" to true,
      "windowStart" to start,
      "windowEnd" to end,
      "apps" to apps
    )
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
/**
 * Persist the disarmed state synchronously before asking the running service
 * to release audio, vibration, torch and notifications. Roll back if Android
 * rejects the command so the UI never reports a completed disarm falsely.
 */
private fun requestAntiTheftDisarm(context: Context) {
  val prefs = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
  val wasArmed = prefs.getBoolean("anti_theft_enabled", false)
  val wasAlarmActive = prefs.getBoolean("anti_theft_alarm_active", false)
  val wasBaselineConnected = prefs.getBoolean("anti_theft_baseline_connected", false)
  check(
    prefs.edit()
      .putBoolean("anti_theft_enabled", false)
      .putBoolean("anti_theft_alarm_active", false)
      .putBoolean("anti_theft_baseline_connected", false)
      .commit()
  ) { "Could not persist Anti-Theft disarm state" }

  try {
    val intent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
      action = VoltGuardBatteryMonitorService.ACTION_ANTI_THEFT_STOP
    }
    // The caller is the visible Anti-Theft screen, so a regular service start
    // is permitted and does not request foreground-service promotion.
    context.startService(intent)
  } catch (error: Exception) {
    val restored = prefs.edit()
      .putBoolean("anti_theft_enabled", wasArmed)
      .putBoolean("anti_theft_alarm_active", wasAlarmActive)
      .putBoolean("anti_theft_baseline_connected", wasBaselineConnected)
      .commit()
    if (!restored) {
      throw IllegalStateException("Android rejected disarm and the previous protection state could not be restored", error)
    }
    throw IllegalStateException("Android could not complete Anti-Theft disarm. Protection state was restored.", error)
  }
}

}
