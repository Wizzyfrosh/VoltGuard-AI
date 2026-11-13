package expo.modules.voltguardbattery

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import java.security.SecureRandom

/**
 * Stores a PIN verifier encrypted with a non-exportable Android Keystore key.
 * The PIN itself is never persisted. A slow salted KDF limits online guessing;
 * persistent lockout counters add a second barrier.
 */
object VoltGuardAntiTheftSecurity {
  private const val PREFS = "voltguard_battery_monitor"
  private const val KEY_PIN_RECORD = "anti_theft_pin_record"
  private const val KEY_FAILED_ATTEMPTS = "anti_theft_failed_attempts"
  private const val KEY_LOCKED_UNTIL = "anti_theft_locked_until"
  private const val KEY_ALIAS = "voltguard_anti_theft_pin_v1"
  private const val ITERATIONS = 210_000
  private const val KEY_BITS = 256
  private const val MAX_ATTEMPTS = 5
  private const val LOCKOUT_MS = 60_000L

  fun hasPin(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).contains(KEY_PIN_RECORD)

  @Synchronized
  fun setPin(context: Context, pin: String) {
    require(pin.matches(Regex("^[0-9]{6,12}$"))) { "PIN must contain 6 to 12 digits" }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    require(!prefs.getBoolean("anti_theft_enabled", false) &&
      !prefs.getBoolean("anti_theft_alarm_active", false)) {
      "Disarm Anti-Theft before changing its PIN"
    }
    val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
    val hash = derive(pin, salt)
    val payload = Base64.encodeToString(salt + hash, Base64.NO_WRAP)
    val encrypted = encrypt(payload.toByteArray(Charsets.UTF_8))
    check(prefs.edit()
      .putString(KEY_PIN_RECORD, Base64.encodeToString(encrypted, Base64.NO_WRAP))
      .remove(KEY_FAILED_ATTEMPTS)
      .remove(KEY_LOCKED_UNTIL)
      .commit()) { "Could not securely save the Anti-Theft PIN" }
  }

  @Synchronized
  fun verifyPin(context: Context, pin: String): Boolean {
    require(pin.matches(Regex("^[0-9]{6,12}$"))) { "PIN must contain 6 to 12 digits" }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val record = prefs.getString(KEY_PIN_RECORD, null) ?: return false
    val lockedUntil = prefs.getLong(KEY_LOCKED_UNTIL, 0L)
    if (System.currentTimeMillis() < lockedUntil) {
      throw IllegalStateException("Too many incorrect PIN attempts. Try again later.")
    }

    val valid = try {
      val encrypted = Base64.decode(record, Base64.NO_WRAP)
      val payload = decrypt(encrypted)
      val decoded = Base64.decode(payload, Base64.NO_WRAP)
      if (decoded.size != 48) false else {
        val salt = decoded.copyOfRange(0, 16)
        val expected = decoded.copyOfRange(16, 48)
        constantTimeEquals(expected, derive(pin, salt))
      }
    } catch (_: Exception) {
      throw IllegalStateException("The saved security credential is unavailable. Reset Anti-Theft setup.")
    }

    if (valid) {
      check(prefs.edit().remove(KEY_FAILED_ATTEMPTS).remove(KEY_LOCKED_UNTIL).commit()) {
        "Could not persist Anti-Theft security state"
      }
      return true
    }

    val attempts = prefs.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
    val editor = prefs.edit().putInt(KEY_FAILED_ATTEMPTS, attempts)
    if (attempts >= MAX_ATTEMPTS) {
      editor.putLong(KEY_LOCKED_UNTIL, System.currentTimeMillis() + LOCKOUT_MS)
        .putInt(KEY_FAILED_ATTEMPTS, 0)
    }
    check(editor.commit()) { "Could not persist Anti-Theft lockout state" }
    return false
  }

  private fun derive(pin: String, salt: ByteArray): ByteArray {
    val spec = PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, KEY_BITS)
    return try {
      SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    } finally {
      spec.clearPassword()
    }
  }

  private fun constantTimeEquals(left: ByteArray, right: ByteArray): Boolean {
    if (left.size != right.size) return false
    var difference = 0
    for (index in left.indices) difference = difference or (left[index].toInt() xor right[index].toInt())
    return difference == 0
  }

  private fun getOrCreateKey(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build()
    )
    return generator.generateKey()
  }

  private fun encrypt(plainText: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
    return cipher.iv + cipher.doFinal(plainText)
  }

  private fun decrypt(encrypted: ByteArray): String {
    require(encrypted.size > 12) { "Invalid encrypted PIN record" }
    val iv = encrypted.copyOfRange(0, 12)
    val ciphertext = encrypted.copyOfRange(12, encrypted.size)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
    return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
  }
}
