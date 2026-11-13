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
import android.os.Handler
import android.os.Looper
import android.media.MediaPlayer
import android.media.AudioManager
import android.media.AudioFocusRequest
import android.os.PowerManager
import android.media.RingtoneManager
import android.media.AudioAttributes
import android.util.Log

class VoltGuardBatteryMonitorService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.voltguardbattery.START_MONITORING"
    const val ACTION_STOP = "expo.modules.voltguardbattery.STOP_MONITORING"
    const val ACTION_RESTORE = "expo.modules.voltguardbattery.RESTORE_MONITORING"
    const val EXTRA_THRESHOLD = "threshold"
    const val ACTION_ANTI_THEFT_START = "expo.modules.voltguardbattery.ANTI_THEFT_START"
    const val ACTION_ANTI_THEFT_STOP = "expo.modules.voltguardbattery.ANTI_THEFT_STOP"
    const val EXTRA_ANTI_THEFT_MODE = "anti_theft_mode"
    private const val PREFS = "voltguard_battery_monitor"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_THRESHOLD = "threshold"
    private const val KEY_NOTIFIED = "notified_this_charge"
    private const val KEY_ANTI_THEFT_ENABLED = "anti_theft_enabled"
    private const val KEY_ANTI_THEFT_MODE = "anti_theft_mode"
    private const val KEY_ANTI_THEFT_BASELINE = "anti_theft_baseline_connected"
    private const val KEY_ANTI_THEFT_ALARM = "anti_theft_alarm_active"
    private const val KEY_ANTI_THEFT_DELAY_SECONDS = "anti_theft_delay_seconds"
    private const val SERVICE_CHANNEL = VoltGuardBatteryNotifications.SERVICE_CHANNEL_ID
    private const val SERVICE_NOTIFICATION_ID = 7411

    /** Stop without issuing a new background service start request. */
    fun stop(context: Context) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_ENABLED, false)
        .apply()
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      if (!prefs.getBoolean(KEY_ANTI_THEFT_ENABLED, false) && !prefs.getBoolean(KEY_ANTI_THEFT_ALARM, false)) {
        context.stopService(Intent(context, VoltGuardBatteryMonitorService::class.java))
      }
    }
  }

  private var receiverRegistered = false
  private var alarmPlayer: MediaPlayer? = null
  private var audioManager: AudioManager? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var pendingDisconnect: Runnable? = null

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
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (intent?.action == ACTION_ANTI_THEFT_START) {
      val mode = intent.getStringExtra(EXTRA_ANTI_THEFT_MODE) ?: "one_time"
      require(mode == "one_time" || mode == "always")
      prefs.edit().putBoolean(KEY_ANTI_THEFT_ENABLED, true).putString(KEY_ANTI_THEFT_MODE, mode)
        .putBoolean(KEY_ANTI_THEFT_BASELINE, false).apply()
    }
    if (intent?.action == ACTION_ANTI_THEFT_STOP) {
      prefs.edit().putBoolean(KEY_ANTI_THEFT_ENABLED, false).putBoolean(KEY_ANTI_THEFT_ALARM, false).apply()
      stopAlarmSound()
      VoltGuardBatteryNotifications.clearAntiTheftAlarm(this)
    }
    if (intent?.action == ACTION_STOP) {
      getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, false).apply()
      stopIfIdle()
      return START_NOT_STICKY
    }

    if (intent?.action == ACTION_START) {
      val requestedThreshold = intent.getIntExtra(EXTRA_THRESHOLD, prefs.getInt(KEY_THRESHOLD, 80))
      if (requestedThreshold in 50..100) {
        val previous = prefs.getInt(KEY_THRESHOLD, 80)
        val editor = prefs.edit().putBoolean(KEY_ENABLED, true).putInt(KEY_THRESHOLD, requestedThreshold)
        if (previous != requestedThreshold) editor.putBoolean(KEY_NOTIFIED, false)
        editor.apply()
      }
    }

    if (!prefs.getBoolean(KEY_ENABLED, false) && !prefs.getBoolean(KEY_ANTI_THEFT_ENABLED, false) && !prefs.getBoolean(KEY_ANTI_THEFT_ALARM, false)) {
      stopMonitoring()
      return START_NOT_STICKY
    }

    val started = try {
      startAsForegroundService()
    } catch (error: SecurityException) {
      // Android can reject foreground promotion when the manifest permission,
      // notification policy, or OS foreground-service rules are not satisfied.
      Log.e("VoltGuardMonitor", "Android denied foreground-service promotion", error)
      false
    } catch (error: IllegalStateException) {
      // Includes OS restrictions such as a disallowed background FGS start.
      Log.e("VoltGuardMonitor", "Foreground monitoring could not be started", error)
      false
    } catch (error: Exception) {
      Log.e("VoltGuardMonitor", "Unexpected foreground-monitor startup failure", error)
      false
    }

    if (!started) {
      // Do not leave persisted state claiming that monitoring is active after
      // Android rejected startup; otherwise boot handling can repeatedly retry.
      prefs.edit().putBoolean(KEY_ENABLED, false).putBoolean(KEY_ANTI_THEFT_ENABLED, false)
        .putBoolean(KEY_ANTI_THEFT_ALARM, false).apply()
      stopMonitoring()
      VoltGuardBatteryNotifications.clearAntiTheftAlarm(this)
      return START_NOT_STICKY
    }
    if (prefs.getBoolean(KEY_ANTI_THEFT_ALARM, false)) startAlarmSound()
    return START_STICKY
  }

  private fun startAsForegroundService(): Boolean {
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
    if (!registerBatteryReceiver()) {
      // Never leave an apparently active foreground monitor running without
      // the battery-change receiver required to evaluate the selected target.
      stopIfIdle()
      return false
    }
    val stickyIntent = try {
      @Suppress("DEPRECATION")
      registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (_: Exception) {
      null
    }
    if (stickyIntent != null) evaluateBattery(stickyIntent)
    return true
  }

  private fun registerBatteryReceiver(): Boolean {
    if (receiverRegistered) return true
    return try {
      val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
      if (Build.VERSION.SDK_INT >= 33) {
        registerReceiver(batteryReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        registerReceiver(batteryReceiver, filter)
      }
      receiverRegistered = true
      true
    } catch (_: Exception) {
      receiverRegistered = false
      false
    }
  }

  private fun evaluateBattery(intent: Intent) {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    evaluateAntiTheft(intent)
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

  private fun evaluateAntiTheft(intent: Intent) {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_ANTI_THEFT_ENABLED, false)) {
      cancelPendingDisconnect()
      return
    }
    val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
    val baseline = prefs.getBoolean(KEY_ANTI_THEFT_BASELINE, false)
    if (plugged) {
      cancelPendingDisconnect()
      if (!baseline) prefs.edit().putBoolean(KEY_ANTI_THEFT_BASELINE, true).apply()
      return
    }
    if (!baseline || prefs.getBoolean(KEY_ANTI_THEFT_ALARM, false) || pendingDisconnect != null) return

    val delaySeconds = prefs.getInt(KEY_ANTI_THEFT_DELAY_SECONDS, 5).coerceIn(0, 30)
    val disconnectCheck = Runnable {
      pendingDisconnect = null
      val latest = try {
        @Suppress("DEPRECATION")
        registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      } catch (_: Exception) { null }
      val stillUnplugged = latest != null &&
        latest.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) == 0
      val currentPrefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      if (!stillUnplugged ||
        !currentPrefs.getBoolean(KEY_ANTI_THEFT_ENABLED, false) ||
        currentPrefs.getBoolean(KEY_ANTI_THEFT_ALARM, false)
      ) return@Runnable

      val mode = currentPrefs.getString(KEY_ANTI_THEFT_MODE, "one_time") ?: "one_time"
      val editor = currentPrefs.edit().putBoolean(KEY_ANTI_THEFT_ALARM, true)
      if (mode == "one_time") editor.putBoolean(KEY_ANTI_THEFT_ENABLED, false)
      else editor.putBoolean(KEY_ANTI_THEFT_BASELINE, false)
      editor.apply()
      VoltGuardBatteryNotifications.postAntiTheftAlarm(this, mode)
      startAlarmSound()
      updateForegroundNotification()
    }
    pendingDisconnect = disconnectCheck
    mainHandler.postDelayed(disconnectCheck, delaySeconds * 1000L)
  }

  private fun cancelPendingDisconnect() {
    pendingDisconnect?.let(mainHandler::removeCallbacks)
    pendingDisconnect = null
  }

  private fun updateForegroundNotification() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(SERVICE_NOTIFICATION_ID, buildServiceNotification())
  }

  private fun startAlarmSound() {
    if (alarmPlayer != null) return
    stopAlarmSound()
    try {
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: return
      val manager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audioManager = manager
      val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS) {
          // Do not silently continue competing with another app after permanent
          // focus loss. The persistent alarm notification remains visible.
          stopAlarmSound()
        }
      }
      val focusGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
          .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
          .setOnAudioFocusChangeListener(focusListener)
          .setWillPauseWhenDucked(false)
          .build()
        audioFocusRequest = request
        manager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      } else {
        @Suppress("DEPRECATION")
        manager.requestAudioFocus(focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      }
      if (!focusGranted) {
        Log.w("VoltGuardMonitor", "Android did not grant alarm audio focus")
        return
      }

      val player = MediaPlayer()
      alarmPlayer = player
      player.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
      player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK)
      player.isLooping = true
      player.setOnPreparedListener { prepared ->
        val alarmStillActive = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
          .getBoolean(KEY_ANTI_THEFT_ALARM, false)
        if (alarmStillActive && alarmPlayer === prepared) {
          try { prepared.start() } catch (error: Exception) {
            Log.w("VoltGuardMonitor", "Anti-Theft alarm playback could not start", error)
            stopAlarmSound()
          }
        } else {
          stopAlarmSound()
        }
      }
      player.setOnErrorListener { failed, what, extra ->
        Log.e("VoltGuardMonitor", "Anti-Theft MediaPlayer error: $what/$extra")
        if (alarmPlayer === failed) stopAlarmSound()
        true
      }
      player.setDataSource(this, uri)
      player.prepareAsync()
    } catch (error: Exception) {
      Log.w("VoltGuardMonitor", "Anti-Theft alarm audio could not start", error)
      stopAlarmSound()
    }
  }

  private fun stopAlarmSound() {
    val player = alarmPlayer
    alarmPlayer = null
    try { player?.setOnPreparedListener(null) } catch (_: Exception) {}
    try { player?.setOnErrorListener(null) } catch (_: Exception) {}
    try { player?.stop() } catch (_: Exception) {}
    try { player?.release() } catch (_: Exception) {}
    val manager = audioManager
    audioManager = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let { request ->
        try { manager?.abandonAudioFocusRequest(request) } catch (_: Exception) {}
      }
      audioFocusRequest = null
    } else if (manager != null) {
      @Suppress("DEPRECATION")
      try { manager.abandonAudioFocus(null) } catch (_: Exception) {}
    }
  }

  private fun stopIfIdle() {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (prefs.getBoolean(KEY_ENABLED, false) || prefs.getBoolean(KEY_ANTI_THEFT_ENABLED, false) ||
      prefs.getBoolean(KEY_ANTI_THEFT_ALARM, false)) return
    stopMonitoring()
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
      .setSmallIcon(R.drawable.ic_voltguard_notification)
      .setContentTitle("VoltGuard is monitoring your battery")
      .setContentText(if ((getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ANTI_THEFT_ENABLED, false) || getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ANTI_THEFT_ALARM, false))) "VoltGuard Anti-Theft protection is active" else "Alert at ${getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_THRESHOLD, 80)}% while charging")
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
    cancelPendingDisconnect()
    stopAlarmSound()
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
    cancelPendingDisconnect()
    stopAlarmSound()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
