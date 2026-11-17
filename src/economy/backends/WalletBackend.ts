/**
 * Bulut deposu arayüzü. WalletService yalnızca bunu bilir; arkasında bugün
 * iCloud anahtar-değer deposu var (ICloudKVSWalletBackend, 8. aşama), yarın
 * CloudKit ya da kendi sunucumuz olabilir.
 *
 * Sözleşme:
 *  - Depo, cihaz anahtarı → metin (JSON) tutar.
 *  - Yazma "en sonunda tutarlı"dır: yazılan değer diğer cihazlara hemen
 *    yansımayabilir; çağıran buna güvenmez.
 *  - Depo kullanılamıyorsa (iCloud kapalı) okuma boş döner, yazma hata fırlatır;
 *    veri yerelde kalır ve depo açılınca gönderilir.
 */
export interface WalletBackend {
  /** Depo şu an kullanılabilir mi (iCloud'a giriş yapılmış mı)? */
  isAvailable(): Promise<boolean>;
  /** Verilen önekle başlayan bütün anahtarlar ve değerleri. */
  readAll(prefix: string): Promise<Record<string, string>>;
  /** Kullanılamıyorsa hata fırlatır. */
  write(key: string, value: string): Promise<void>;
  /** Başka bir cihazdan değişiklik geldiğinde çağrılır. Dönen fonksiyon aboneliği bitirir. */
  subscribe(onChange: () => void): () => void;
}

/** Senkron yerel depo (cihazda MMKV; testlerde bellek). */
export interface LocalStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}
