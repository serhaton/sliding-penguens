/**
 * Gerçek mağaza: expo-iap (StoreKit 2). Kütüphaneye dokunan tek dosya.
 *
 * Akış: `requestPurchase` yalnızca satın almayı başlatır; sonuç dinleyicilere
 * gelir. Tamamlanan her alım önce teslim edilir (cüzdana yazılır), sonra
 * `finishTransaction` ile bitirilir. Uygulama kapalıyken tamamlanan ya da
 * yarım kalan alımlar da açılışta aynı dinleyiciden gelir.
 */
import type { Purchase } from 'expo-iap';

import type { BuyResult, Deliver, StoreBackend, StorePurchase } from './types';

type Iap = typeof import('expo-iap');

/** Kütüphane yerel modülü bu derlemede yoksa null (eski geliştirme derlemesi). */
function loadIap(): Iap | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-iap') as Iap;
  } catch {
    return null;
  }
}

export class ExpoIapBackend implements StoreBackend {
  readonly simulated = false;
  private iap: Iap | null = null;
  /** Devam eden satın almalar: ürün → sonucu bekleyen çağrı. */
  private readonly waiting = new Map<string, (result: BuyResult) => void>();

  async connect(deliver: Deliver, consumable: (productId: string) => boolean): Promise<boolean> {
    const iap = loadIap();
    if (!iap) return false;
    try {
      if (!(await iap.initConnection())) return false;
    } catch {
      return false;
    }
    this.iap = iap;

    iap.purchaseUpdatedListener((purchase: Purchase) => {
      void (async () => {
        // Onay bekleyen alım ("Satın Almak İçin Sor"): ödül verilmez, sonuç sonra gelir.
        if (purchase.purchaseState !== 'purchased') {
          this.settle(purchase.productId, { status: 'pending' });
          return;
        }
        try {
          await deliver({ productId: purchase.productId, transactionId: purchase.id });
          await iap.finishTransaction({ purchase, isConsumable: consumable(purchase.productId) });
          this.settle(purchase.productId, { status: 'purchased' });
        } catch {
          // Teslim edilemedi: işlem bitirilmez, bir sonraki açılışta yeniden gelir.
          this.settle(purchase.productId, { status: 'failed' });
        }
      })();
    });

    iap.purchaseErrorListener((error) => {
      const result: BuyResult = iap.isUserCancelledError(error) ? { status: 'cancelled' } : { status: 'failed' };
      const productId = (error as { productId?: string | null }).productId;
      if (productId) this.settle(productId, result);
      else for (const id of [...this.waiting.keys()]) this.settle(id, result);
    });
    return true;
  }

  async prices(productIds: readonly string[]): Promise<Record<string, string>> {
    if (!this.iap) return {};
    try {
      const found = (await this.iap.fetchProducts({ skus: [...productIds], type: 'in-app' })) ?? [];
      return Object.fromEntries(found.map((product) => [product.id, product.displayPrice]));
    } catch {
      return {};
    }
  }

  buy(productId: string): Promise<BuyResult> {
    const iap = this.iap;
    if (!iap) return Promise.resolve({ status: 'failed' });
    return new Promise<BuyResult>((resolve) => {
      this.waiting.set(productId, resolve);
      iap
        .requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' })
        // Sonuç dinleyicilerden gelir; burada yalnızca başlatılamayan istek yakalanır.
        .catch((error: unknown) =>
          this.settle(productId, iap.isUserCancelledError(error) ? { status: 'cancelled' } : { status: 'failed' }),
        );
    });
  }

  async owned(): Promise<StorePurchase[] | null> {
    if (!this.iap) return null;
    try {
      const purchases = await this.iap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      return purchases.map((purchase) => ({ productId: purchase.productId, transactionId: purchase.id }));
    } catch {
      return null;
    }
  }

  private settle(productId: string, result: BuyResult): void {
    const resolve = this.waiting.get(productId);
    if (!resolve) return;
    this.waiting.delete(productId);
    resolve(result);
  }
}
