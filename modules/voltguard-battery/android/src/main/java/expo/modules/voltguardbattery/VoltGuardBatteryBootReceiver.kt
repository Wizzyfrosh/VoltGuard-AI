package expo.modules.voltguardbattery

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

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
    } catch (_: Exception) {
      // Android/OEM policy may defer or deny automatic restart. The user can re-enable it in VoltGuard.
    }
  }
}
