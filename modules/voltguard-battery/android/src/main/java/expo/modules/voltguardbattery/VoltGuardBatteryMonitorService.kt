package expo.modules.voltguardbattery

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder

class VoltGuardBatteryMonitorService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.voltguardbattery.START_MONITORING"
    const val ACTION_STOP = "expo.modules.voltguardbattery.STOP_MONITORING"
    const val EXTRA_THRESHOLD = "threshold"
    private const val PREFS = "voltguard_battery_monitor"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_THRESHOLD = "threshold"
    private const val KEY_NOTIFIED = "notified_this_charge"
    private const val SERVICE_CHANNEL = VoltGuardBatteryNotifications.SERVICE_CHANNEL_ID
    private const val SERVICE_NOTIFICATION_ID = 7411
  }

  private var receiverRegistered = false

  private val batteryReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
      if (intent?.action != Intent.ACTION_BATTERY_CHANGED) return
      evaluateBattery(intent)
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, false).apply()
      stopMonitoring()
      return START_NOT_STICKY
    }

    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (intent?.action == ACTION_START) {
      val requestedThreshold = intent.getIntExtra(EXTRA_THRESHOLD, prefs.getInt(KEY_THRESHOLD, 80))
      if (requestedThreshold in 50..100) {
        val previous = prefs.getInt(KEY_THRESHOLD, 80)
        val editor = prefs.edit().putBoolean(KEY_ENABLED, true).putInt(KEY_THRESHOLD, requestedThreshold)
        if (previous != requestedThreshold) editor.putBoolean(KEY_NOTIFIED, false)
        editor.apply()
      }
    }

    if (!prefs.getBoolean(KEY_ENABLED, false)) {
      stopMonitoring()
      return START_NOT_STICKY
    }

    startAsForegroundService()
    return START_STICKY
  }

  private fun startAsForegroundService() {
    val notification = buildServiceNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        SERVICE_NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(SERVICE_NOTIFICATION_ID, notification)
    }
    registerBatteryReceiver()
    val stickyIntent = try {
      @Suppress("DEPRECATION")
      registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (_: Exception) {
      null
    }
    if (stickyIntent != null) evaluateBattery(stickyIntent)
  }

  private fun registerBatteryReceiver() {
    if (receiverRegistered) return
    try {
      val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
      if (Build.VERSION.SDK_INT >= 33) {
        registerReceiver(batteryReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        registerReceiver(batteryReceiver, filter)
      }
      receiverRegistered = true
    } catch (_: Exception) {
      receiverRegistered = false
    }
  }

  private fun evaluateBattery(intent: Intent) {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_ENABLED, false)) return

    val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
    val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
    val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
    if (level < 0 || scale <= 0) return

    val percentage = (level * 100f / scale).toInt().coerceIn(0, 100)
    val connectedToPower = plugged != 0
    val charging = connectedToPower && (
      status == BatteryManager.BATTERY_STATUS_CHARGING ||
      status == BatteryManager.BATTERY_STATUS_FULL
    )

    if (!connectedToPower) {
      if (prefs.getBoolean(KEY_NOTIFIED, false)) prefs.edit().putBoolean(KEY_NOTIFIED, false).apply()
      return
    }
    if (!charging) return

    val threshold = prefs.getInt(KEY_THRESHOLD, 80)
    if (percentage >= threshold && !prefs.getBoolean(KEY_NOTIFIED, false)) {
      // Do not consume the one-alert-per-charge flag when Android has blocked
      // notifications. A later battery event can retry after permission/channel
      // access is restored.
      if (postThresholdNotification(percentage, threshold)) {
        prefs.edit().putBoolean(KEY_NOTIFIED, true).apply()
      }
    }
  }

  private fun createNotificationChannels() {
    VoltGuardBatteryNotifications.createChannels(this)
  }

  private fun buildServiceNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, SERVICE_CHANNEL)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
      .setContentTitle("VoltGuard is monitoring your battery")
      .setContentText("Alert at ${getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_THRESHOLD, 80)}% while charging")
      .setContentIntent(pendingIntent)
      .setPriority(Notification.PRIORITY_LOW)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
  }

  private fun postThresholdNotification(level: Int, threshold: Int): Boolean {
    return VoltGuardBatteryNotifications.postChargingTargetAlarm(this, level, threshold)
  }

  private fun stopMonitoring() {
    if (receiverRegistered) {
      try { unregisterReceiver(batteryReceiver) } catch (_: Exception) {}
      receiverRegistered = false
    }
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    if (receiverRegistered) {
      try { unregisterReceiver(batteryReceiver) } catch (_: Exception) {}
      receiverRegistered = false
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
