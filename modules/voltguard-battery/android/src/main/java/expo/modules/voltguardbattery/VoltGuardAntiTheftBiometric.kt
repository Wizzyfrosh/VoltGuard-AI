package expo.modules.voltguardbattery

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.Executor
import kotlin.coroutines.resume

/**
 * Uses Android's strong-biometric prompt. VoltGuard never receives or stores
 * biometric templates; the OS performs verification. App PIN remains a
 * separate explicit fallback when the prompt is unavailable or cancelled.
 */
object VoltGuardAntiTheftBiometric {
  fun isAvailable(activity: FragmentActivity): Boolean {
    return BiometricManager.from(activity)
      .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
      BiometricManager.BIOMETRIC_SUCCESS
  }

  suspend fun authenticate(activity: FragmentActivity): Boolean {
    require(isAvailable(activity)) { "Strong biometric authentication is not available on this device." }
    return suspendCancellableCoroutine { continuation ->
      // Avoid Activity.mainExecutor (API 28+) so the native module remains compatible
      // with the app's lower Android minSdk versions.
      val executor: Executor = Executor { command -> Handler(Looper.getMainLooper()).post(command) }
      val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          if (continuation.isActive) continuation.resume(true)
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          if (continuation.isActive) continuation.resume(false)
        }

        override fun onAuthenticationFailed() {
          // A non-matching scan is not terminal; Android keeps the prompt open
          // so the user can retry or choose the explicit PIN fallback.
        }
      })
      val info = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Disarm VoltGuard Anti-Theft")
        .setSubtitle("Confirm your identity to stop the alarm and disarm protection")
        .setDescription("Use your enrolled strong biometric. You can cancel and enter your Anti-Theft PIN instead.")
        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        .setNegativeButtonText("Use PIN instead")
        .build()
      prompt.authenticate(info)
      continuation.invokeOnCancellation {
        Handler(Looper.getMainLooper()).post { prompt.cancelAuthentication() }
      }
    }
  }
}
