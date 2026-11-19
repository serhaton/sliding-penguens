/**
 * Gerçek parayla satılan ürünler (App Store). Fiyatlar burada tutulmaz: App
 * Store Connect'te belirlenir ve mağazadan oyuncunun para birimiyle okunur.
 * `devPrice` yalnızca geliştirme sürümünde, mağaza bağlanamadığında gösterilir.
 *
 * Yeni bir ürün eklemek için: buraya bir satır, coin miktarını
 * economy.config.ts'e (coinPacks), aynı kimlikle App Store Connect'e ürün.
 *
 * App Store Connect'teki ürün kimliği = STORE_PREFIX + id
 * (ör. com.serhatonal.pengoloGame.coins.small).
 */
import { cosmetics } from '@/data/cosmetics';
import { economy } from '@/economy/economy.config';
import type { TranslationKey } from '@/i18n';

export const STORE_PREFIX = 'com.serhatonal.pengoloGame.';

export type ProductId = keyof typeof economy.coinPacks | 'noads';

export interface Product {
  id: ProductId;
  /**
   * consumable: her alışta yeniden verilir (coin paketleri).
   * permanent: bir kez alınır, kalıcıdır ve geri yüklenebilir.
   */
  kind: 'consumable' | 'permanent';
  /** Verdiği coin (yoksa 0). */
  coins: number;
  /** Reklamları kaldırır mı? */
  noAds: boolean;
  nameKey: TranslationKey;
  /** Kısa açıklama: içinde ne var. */
  bodyKey: TranslationKey;
  /** Köşe rozeti: "En sevilen", "En avantajlı". */
  badgeKey?: TranslationKey;
  /** Yalnızca ilk 48 saat gösterilen tek seferlik teklif. */
  starter?: boolean;
  /** Mağaza bağlanamadığında (geliştirme) gösterilen fiyat. */
  devPrice: string;
}

const coins = (id: keyof typeof economy.coinPacks) => economy.coinPacks[id];

export const products: readonly Product[] = [
  {
    id: 'starter.pack',
    kind: 'permanent',
    coins: coins('starter.pack'),
    noAds: true,
    nameKey: 'shop.starter',
    bodyKey: 'shop.starterBody',
    badgeKey: 'shop.badgeOnce',
    starter: true,
    devPrice: '$1.99',
  },
  { id: 'coins.small', kind: 'consumable', coins: coins('coins.small'), noAds: false, nameKey: 'shop.coinsSmall', bodyKey: 'shop.coinsBody', devPrice: '$0.99' },
  {
    id: 'coins.medium',
    kind: 'consumable',
    coins: coins('coins.medium'),
    noAds: false,
    nameKey: 'shop.coinsMedium',
    bodyKey: 'shop.coinsBody',
    badgeKey: 'shop.badgePopular',
    devPrice: '$2.99',
  },
  {
    id: 'coins.large',
    kind: 'consumable',
    coins: coins('coins.large'),
    noAds: false,
    nameKey: 'shop.coinsLarge',
    bodyKey: 'shop.coinsBody',
    badgeKey: 'shop.badgeBest',
    devPrice: '$5.99',
  },
  {
    id: 'bundle.aurora',
    kind: 'permanent',
    coins: coins('bundle.aurora'),
    noAds: false,
    nameKey: 'shop.aurora',
    bodyKey: 'shop.auroraBody',
    devPrice: '$3.99',
  },
  { id: 'noads', kind: 'permanent', coins: 0, noAds: true, nameKey: 'shop.noAds', bodyKey: 'shop.noAdsBody', devPrice: '$2.99' },
];

export const storeId = (id: ProductId) => `${STORE_PREFIX}${id}`;

export function getProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

/** Mağaza kimliğinden (önekli) ürünü bulur. */
export function productForStoreId(id: string): Product | undefined {
  return id.startsWith(STORE_PREFIX) ? getProduct(id.slice(STORE_PREFIX.length)) : getProduct(id);
}

/** Ürünle birlikte gelen (coinle alınamayan) kostümler. */
export function exclusivesOf(id: ProductId) {
  return cosmetics.filter((item) => item.exclusive === id);
}

/** Başlangıç paketinin gösterildiği süre: ilk açılıştan sonra 48 saat. */
export const STARTER_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Oyuncunun kalıcı ürünlerinden biri reklamları kaldırıyor mu? */
export function hasNoAds(entitlements: readonly string[]): boolean {
  return products.some((product) => product.noAds && entitlements.includes(product.id));
}
