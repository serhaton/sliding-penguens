/**
 * iCloud anahtar-değer deposu (NSUbiquitousKeyValueStore) üstünde bulut deposu.
 *
 * Native erişim `ICloudStore` arayüzünün arkasında: cihazda
 * @nauverse/expo-cloud-settings (bkz. services/icloudKVS.ts), testlerde sahte
 * bir depo. Bu sınıf native modülü doğrudan içe aktarmaz.
 *
 * iCloud sınırları: toplam 1 MB, en fazla 1024 anahtar, anahtar en fazla 64
 * bayt. Senkronizasyon anlık değildir; sistem uygun bulduğunda gönderir.
 * Yazdığımız değerin diğer cihazlara hemen ulaştığı varsayılmaz.
 */
import type { WalletBackend } from './WalletBackend';

export type ICloudChangeReason = 'serverChange' | 'initialSync' | 'quotaViolation' | 'accountChange';

/** iCloud anahtar-değer deposunun bize gereken kısmı. */
export interface ICloudStore {
  /** Kullanıcı iCloud'a giriş yapmış mı? */
  isAvailable(): boolean;
  getAllKeys(): string[];
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  /** Başka bir cihazdan (ya da hesap değişikliğinden) gelen değişiklikler. */
  addChangeListener(
    callback: (event: { changedKeys: readonly string[]; reason: ICloudChangeReason }) => void,
  ): { remove(): void };
}

export class ICloudKVSWalletBackend implements WalletBackend {
  /** iCloud "kota aşıldı" bildirdiyse true: yazılanlar artık saklanmıyor olabilir. */
  quotaExceeded = false;

  constructor(private readonly store: ICloudStore) {}

  async isAvailable(): Promise<boolean> {
    try {
      return this.store.isAvailable();
    } catch {
      return false;
    }
  }

  async readAll(prefix: string): Promise<Record<string, string>> {
    if (!(await this.isAvailable())) return {};
    const out: Record<string, string> = {};
    for (const key of this.store.getAllKeys()) {
      if (!key.startsWith(prefix)) continue;
      const value = this.store.getString(key);
      if (value !== null) out[key] = value;
    }
    return out;
  }

  async write(key: string, value: string): Promise<void> {
    if (!(await this.isAvailable())) throw new Error('iCloud kullanılamıyor');
    this.store.setString(key, value);
  }

  subscribe(onChange: () => void): () => void {
    const subscription = this.store.addChangeListener((event) => {
      if (event.reason === 'quotaViolation') this.quotaExceeded = true;
      // Neden ne olursa olsun (sunucu değişikliği, ilk eşitleme, hesap değişimi)
      // yapılacak şey aynı: bütün cihaz belgelerini yeniden oku ve birleştir.
      onChange();
    });
    return () => subscription.remove();
  }
}
