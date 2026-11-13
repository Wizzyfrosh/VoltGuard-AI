package expo.modules.voltguardbattery

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build

/**
 * Owns the optional rear-camera torch used during an active Anti-Theft alarm.
 * It never opens a camera preview or captures images.
 */
object VoltGuardAntiTheftFlash {
  fun isAvailable(context: Context): Boolean {
    return try {
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH) &&
        cameraId(context) != null
    } catch (_: Exception) { false }
  }

  fun setEnabled(context: Context, enabled: Boolean): Boolean {
    if (enabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      return false
    }
    return try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return false
      val id = cameraId(manager) ?: return false
      manager.setTorchMode(id, enabled)
      true
    } catch (_: SecurityException) {
      // Permission may be revoked after the setting was enabled.
      false
    } catch (_: Exception) {
      // Camera can be busy, unavailable, or removed while an alarm is active.
      false
    }
  }

  private fun cameraId(context: Context): String? {
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return null
    return cameraId(manager)
  }

  private fun cameraId(manager: CameraManager): String? {
    return manager.cameraIdList.firstOrNull { id ->
      val characteristics = manager.getCameraCharacteristics(id)
      characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
        characteristics.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
    }
  }
}
