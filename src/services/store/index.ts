/**
 * Mağaza servisi: gerçek parayla satın alma.
 *
 *   startStore()                 // uygulama açılışında bir kez
 *   const { prices, entitlements } = useStore();
 *   await buy('coins.small');    // 'purchased' | 'cancelled' | 'pending' | 'failed'
 *   await restore();
 *
 * Kurallar:
 *  - Coinler cüzdana App Store işlem kimliğiyle yazılır: aynı işlem ikinci kez
 *    gelirse (yarım kalan alım, geri yükleme, başka cihaz) coin tekrar verilmez.
 *  - Kalıcı ürünler (reklamsız, paketler) cüzdanda değil burada, "sahip olunan
 *    ürünler" listesinde durur. Liste her açılışta App Store'dan yenilenir:
 *    ürün iade edildiyse listeden düşer, yeni cihazda kendiliğinden geri gelir.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getProduct, productForStoreId, products, storeId, type ProductId } from '@/data/products';
import { wallet } from '@/economy/wallet';
import { zustandKvStorage } from '@/services/storage';

import { DevBackend } from './DevBackend';
import { ExpoIapBackend } from './ExpoIapBackend';
import type { BuyResult, StoreBackend, StorePurchase } from './types';

export interface StoreState {
  /** Mağaza bağlı ve satın alma yapılabilir. */
  ready: boolean;
  /** Taklit mağaza (geliştirme): para alınmaz. */
  simulated: boolean;
  /** Ürün → oyuncunun para birimiyle fiyat. Fiyatı olmayan ürün satılamaz. */
  prices: Partial<Record<ProductId, string>>;
  /** Sahip olunan kalıcı ürünler (reklamsız, paketler). */
  entitlements: ProductId[];
}

export const useStore = create<StoreState>()(
  persist(
    (): StoreState => ({ ready: false, simulated: false, prices: {}, entitlements: [] }),
    {
      name: 'store.v1',
      storage: createJSONStorage(() => zustandKvStorage),
      // Yalnızca sahiplik saklanır: çevrimdışı açılışta da reklamsız ve paket kostümleri bilinsin.
      partialize: ({ entitlements }) => ({ entitlements }),
    },
  ),
);

let backend: StoreBackend | null = null;
let starting: Promise<void> | null = null;

const isConsumable = (id: string) => productForStoreId(id)?.kind !== 'permanent';

/** Satın alımın ödülünü verir: coinler cüzdana, kalıcı ürün sahiplik listesine. */
async function deliver(purchase: StorePurchase): Promise<void> {
  const product = productForStoreId(purchase.productId);
  if (!product) return;
  if (product.coins > 0) await wallet().addPurchase(purchase.transactionId, product.coins);
  if (product.kind === 'permanent') {
    useStore.setState((s) =>
      s.entitlements.includes(product.id) ? s : { entitlements: [...s.entitlements, product.id] },
    );
  }
}

/** Sahipliği App Store'dan yeniler; okunamazsa eldeki liste korunur. */
async function refreshEntitlements(): Promise<boolean> {
  const owned = await backend?.owned();
  if (!owned) return false;
  // Coinli paketler: işlem bu cihazda hiç işlenmediyse (yeni cihaz) coinleri de gelir.
  for (const purchase of owned) await deliver(purchase);
  const ids = owned.map((p) => productForStoreId(p.productId)?.id).filter((id): id is ProductId => !!id);
  useStore.setState({ entitlements: [...new Set(ids)] });
  return true;
}

async function connect(): Promise<void> {
  const ids = products.map((product) => storeId(product.id));
  const unprefix = (found: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(found).flatMap(([id, price]) => {
        const product = productForStoreId(id);
        return product ? [[product.id, price]] : [];
      }),
    );

  let candidate: StoreBackend = new ExpoIapBackend();
  let connected = await candidate.connect(deliver, isConsumable);
  let prices = connected ? unprefix(await candidate.prices(ids)) : {};

  // Geliştirme: gerçek mağaza yoksa ya da ürünler henüz tanımlı değilse taklit mağaza.
  if (__DEV__ && Object.keys(prices).length === 0) {
    candidate = new DevBackend(Object.fromEntries(products.map((p) => [storeId(p.id), p.devPrice])));
    connected = await candidate.connect(deliver, isConsumable);
    prices = unprefix(await candidate.prices(ids));
  }

  backend = candidate;
  useStore.setState({ ready: connected, simulated: candidate.simulated, prices });
  if (connected) await refreshEntitlements();
}

/** Uygulama açılışında bir kez çağrılır (kök yerleşimden). */
export function startStore(): Promise<void> {
  starting ??= connect().catch(() => undefined);
  return starting;
}

/** Ürünü satın alır. Ödül, sonuç dönmeden önce verilmiştir. */
export async function buy(id: ProductId): Promise<BuyResult> {
  await startStore();
  const product = getProduct(id);
  if (!backend || !product || !useStore.getState().prices[id]) return { status: 'failed' };
  return backend.buy(storeId(id));
}

/** "Satın alımları geri yükle": kalıcı ürünler ve coinleri geri gelir. Başarısızsa `false`. */
export async function restore(): Promise<boolean> {
  await startStore();
  return refreshEntitlements();
}

export type { BuyResult } from './types';
