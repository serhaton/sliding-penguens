/**
 * Cihaz kimliği: iCloud'da bu cihazın yazdığı anahtarı (`dev.v1.<deviceId>`)
 * belirler.
 *
 * Keychain'de saklanır, bu yüzden uygulama silinip yeniden yüklenince aynı
 * kimlik geri gelir ve cihaz kendi eski verisinin üstüne devam eder.
 *
 * "Yalnızca bu cihaz" erişimiyle saklanır: kimlik, yedekten başka bir cihaza
 * TAŞINMAZ. Taşınsaydı iki cihaz aynı iCloud anahtarına yazar, sonuncu kazanır
 * ve veri kaybolurdu — tasarımın önlemeye çalıştığı şeyin ta kendisi.
 */
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'wallet.deviceId';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let cached: string | null = null;

/** Senkron: bakiye uygulama açılır açılmaz hesaplanabilsin diye. */
export function getDeviceId(): string {
  if (cached) return cached;
  try {
    const stored = SecureStore.getItem(KEY, OPTIONS);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // Keychain okunamadı (ör. cihaz ilk açılıştan beri hiç kilidi açılmadı).
    // Aşağıda yeni bir kimlik üretilir; eski anahtar iCloud'da durur ve
    // birleştirmeye katılır, yani veri kaybolmaz.
  }
  const fresh = randomUUID();
  try {
    SecureStore.setItem(KEY, fresh, OPTIONS);
  } catch {
    // Yazılamazsa bu oturum boyunca bellekteki kimlik kullanılır.
  }
  cached = fresh;
  return fresh;
}
