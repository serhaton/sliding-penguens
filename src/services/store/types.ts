/**
 * Mağaza arka ucu: App Store ile konuşan ince katman. Ekranlar ve oyun kodu
 * satın alma kütüphanesini doğrudan çağırmaz; yalnızca services/store'u kullanır.
 */

/** Tamamlanmış bir satın alım. `productId` mağaza kimliğidir (önekli). */
export interface StorePurchase {
  productId: string;
  /** App Store işlem kimliği: coinlerin iki kez verilmesini bu engeller. */
  transactionId: string;
}

export type BuyResult = { status: 'purchased' } | { status: 'cancelled' } | { status: 'pending' } | { status: 'failed' };

/**
 * Satın alım teslimi: ödül cüzdana yazılır. Arka uç işlemi ancak bu söz
 * tamamlandıktan sonra bitirir (finish). Uygulama arada kapanırsa işlem bir
 * sonraki açılışta yeniden gelir; ödül idempotent olduğu için iki kez verilmez.
 */
export type Deliver = (purchase: StorePurchase) => Promise<void>;

export interface StoreBackend {
  /** Taklit mağaza mı (geliştirme)? */
  readonly simulated: boolean;
  /** Bağlanır ve satın alım dinleyicisini kurar. Bağlanamazsa `false`. */
  connect(deliver: Deliver, consumable: (productId: string) => boolean): Promise<boolean>;
  /** Mağaza kimliği → oyuncunun para birimiyle fiyat. Bulunamayan ürünler haritada yoktur. */
  prices(productIds: readonly string[]): Promise<Record<string, string>>;
  buy(productId: string): Promise<BuyResult>;
  /** Oyuncunun sahip olduğu kalıcı ürünler (geri yükleme ve iade denetimi). Okunamazsa `null`. */
  owned(): Promise<StorePurchase[] | null>;
}
