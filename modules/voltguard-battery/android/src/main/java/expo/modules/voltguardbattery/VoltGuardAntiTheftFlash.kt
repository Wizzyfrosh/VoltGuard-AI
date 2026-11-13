package expo.modules.voltguardbattery

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import androidx.core.content.ContextCompat

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
    if (enabled && ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      return false
    }
    val id = cameraId(context) ?: return false
    return try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      manager.setTorchMode(id, enabled)
      true
    } catch (_: SecurityException) {
      false
    } catch (_: Exception) {
      false
    }
  }

  private fun cameraId(context: Context): String? {
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return null
    return manager.cameraIdList.firstOrNull { id ->
      manager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
        manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
    }
  }
}
