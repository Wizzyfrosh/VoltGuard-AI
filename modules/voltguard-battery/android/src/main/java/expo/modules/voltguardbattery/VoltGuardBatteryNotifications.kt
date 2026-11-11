package expo.modules.voltguardbattery

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

/**
 * Owns VoltGuard's Android notification channels and charging-target notifications.
 *
 * A new channel ID is intentional: Android does not allow apps to upgrade the
 * importance or sound of an existing channel after the user/device created it.
 */
object VoltGuardBatteryNotifications {
  const val SERVICE_CHANNEL_ID = "battery-monitor-service"
  const val CHARGING_ALARM_CHANNEL_ID = "battery-threshold-alarm-v2"
  const val CHARGING_ALARM_NOTIFICATION_ID = 7412
  const val CHARGING_ALARM_TEST_NOTIFICATION_ID = 7413
  private const val SERVICE_NOTIFICATION_ID = 7411

  private val vibrationPattern = longArrayOf(0, 700, 250, 700, 250)

  fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(
        SERVICE_CHANNEL_ID,
        "Background battery monitoring",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Ongoing notification while VoltGuard monitors your charging threshold"
        setShowBadge(false)
      }
    )

    val alarmAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    manager.createNotificationChannel(
      NotificationChannel(
        CHARGING_ALARM_CHANNEL_ID,
        "Charging target alarm",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Audible and vibrating alert when your selected charging target is reached"
        setSound(alarmSound, alarmAttributes)
        enableVibration(true)
        vibrationPattern = this@VoltGuardBatteryNotifications.vibrationPattern
        enableLights(true)
      }
    )
  }

  fun getChargingAlarmStatus(context: Context): Map<String, Any?> {
    createChannels(context)
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.getNotificationChannel(CHARGING_ALARM_CHANNEL_ID)
    } else {
      null
    }
    val notificationsEnabled = manager.areNotificationsEnabled()
    val importance = channel?.importance ?: NotificationManager.IMPORTANCE_HIGH
    val soundEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      channel?.sound != null
    } else {
      true
    }
    val vibrationEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      channel?.shouldVibrate() == true
    } else {
      true
    }
    val channelEnabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
      (channel != null && channel.importance != NotificationManager.IMPORTANCE_NONE)
    val alarmReady = notificationsEnabled &&
      channelEnabled &&
      importance >= NotificationManager.IMPORTANCE_HIGH &&
      soundEnabled
    return mapOf(
      "channelId" to CHARGING_ALARM_CHANNEL_ID,
      "notificationsEnabled" to notificationsEnabled,
      "channelEnabled" to channelEnabled,
      "highImportance" to (importance >= NotificationManager.IMPORTANCE_HIGH),
      "soundEnabled" to soundEnabled,
      "vibrationEnabled" to vibrationEnabled,
      "alarmReady" to alarmReady
    )
  }

  fun postChargingTargetAlarm(context: Context, level: Int, threshold: Int): Boolean {
    val status = getChargingAlarmStatus(context)
    if (status["alarmReady"] != true) return false

    return try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val notification = buildAlarmNotification(
        context,
        "Charging target reached",
        "Battery is at $level% (target $threshold%). Unplug your charger if convenient."
      )
      manager.notify(CHARGING_ALARM_NOTIFICATION_ID, notification)
      true
    } catch (_: Exception) {
      false
    }
  }

  fun postTestAlarm(context: Context): Boolean {
    val status = getChargingAlarmStatus(context)
    if (status["alarmReady"] != true) {
      throw IllegalStateException(describeAlarmStatus(status))
    }
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(
      CHARGING_ALARM_TEST_NOTIFICATION_ID,
      buildAlarmNotification(
        context,
        "VoltGuard alarm test",
        "This is a test of your charging target alarm sound and vibration."
      )
    )
    return true
  }

  fun describeAlarmStatus(status: Map<String, Any?>): String {
    if (status["notificationsEnabled"] != true) {
      return "VoltGuard notifications are disabled. Enable app notifications in Android Settings."
    }
    if (status["channelEnabled"] != true) {
      return "The Charging target alarm channel is disabled. Enable it in Android notification settings."
    }
    if (status["highImportance"] != true) {
      return "Set Charging target alarm importance to High in Android notification settings."
    }
    if (status["soundEnabled"] != true) {
      return "Charging target alarm sound is set to Silent. Choose an alarm sound in Android notification settings."
    }
    return "Charging target alarm is not ready. Check Android notification settings."
  }

  private fun buildAlarmNotification(context: Context, title: String, body: String): Notification {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHARGING_ALARM_CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).apply {
        setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
        setVibrate(vibrationPattern)
      }
    }
    return builder
      .setSmallIcon(R.drawable.ic_voltguard_notification)
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(pendingIntent)
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setOnlyAlertOnce(false)
      .build()
  }
}
