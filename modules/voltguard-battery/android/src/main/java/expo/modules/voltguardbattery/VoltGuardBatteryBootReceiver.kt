package expo.modules.voltguardbattery

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class VoltGuardBatteryBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED && intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val preferences = context.getSharedPreferences("voltguard_battery_monitor", Context.MODE_PRIVATE)
    if (!preferences.getBoolean("enabled", false)) return

    val serviceIntent = Intent(context, VoltGuardBatteryMonitorService::class.java).apply {
      action = VoltGuardBatteryMonitorService.ACTION_START
      putExtra(VoltGuardBatteryMonitorService.EXTRA_THRESHOLD, preferences.getInt("threshold", 80))
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(serviceIntent)
      else context.startService(serviceIntent)
    } catch (error: Exception) {
      // A denied boot restart must not leave the UI claiming that monitoring
      // is enabled when no service could be started.
      preferences.edit().putBoolean("enabled", false).apply()
      Log.w("VoltGuardMonitor", "Android/OEM policy denied automatic monitor restart", error)
    }
  }
}
