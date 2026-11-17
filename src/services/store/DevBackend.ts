/**
 * Taklit mağaza — yalnızca geliştirme sürümünde, gerçek mağaza bağlanamadığında
 * (yerel modülü olmayan eski derleme, simülatör, App Store'da henüz
 * tanımlanmamış ürünler) kullanılır. Para alınmaz; kısa bir beklemeden sonra
 * alım "tamamlanır" ki mağaza akışı uçtan uca denenebilsin.
 *
 * Yayın sürümünde asla kullanılmaz: mağaza bağlanamazsa satın alma kapalı görünür.
 */
import { kv } from '@/services/storage';

import type { BuyResult, Deliver, StoreBackend, StorePurchase } from './types';

const OWNED_KEY = 'store.dev.owned';
const FAKE_PURCHASE_MS = 700;

export class DevBackend implements StoreBackend {
  readonly simulated = true;
  private deliver: Deliver | null = null;
  private consumable: (productId: string) => boolean = () => true;

  constructor(private readonly devPrices: Record<string, string>) {}

  connect(deliver: Deliver, consumable: (productId: string) => boolean): Promise<boolean> {
    this.deliver = deliver;
    this.consumable = consumable;
    return Promise.resolve(true);
  }

  prices(productIds: readonly string[]): Promise<Record<string, string>> {
    return Promise.resolve(
      Object.fromEntries(productIds.filter((id) => id in this.devPrices).map((id) => [id, this.devPrices[id]!])),
    );
  }

  async buy(productId: string): Promise<BuyResult> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_PURCHASE_MS));
    const purchase = { productId, transactionId: `dev-${Date.now()}` };
    if (!this.consumable(productId)) this.save([...this.read().filter((p) => p.productId !== productId), purchase]);
    await this.deliver?.(purchase);
    return { status: 'purchased' };
  }

  owned(): Promise<StorePurchase[] | null> {
    return Promise.resolve(this.read());
  }

  private read(): StorePurchase[] {
    try {
      return JSON.parse(kv.getString(OWNED_KEY) ?? '[]') as StorePurchase[];
    } catch {
      return [];
    }
  }

  private save(purchases: StorePurchase[]): void {
    kv.set(OWNED_KEY, JSON.stringify(purchases));
  }
}
