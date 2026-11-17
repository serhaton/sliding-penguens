/** Mağaza ürünleri ve kostüm kataloğu tutarlılığı. */
import { cosmetics, cosmeticSlots } from '@/data/cosmetics';
import { economy } from '@/economy/economy.config';
import { en } from '@/i18n/en';
import { tr } from '@/i18n/tr';

import { exclusivesOf, getProduct, hasNoAds, productForStoreId, products, STORE_PREFIX, storeId } from '../products';

describe('mağaza ürünleri', () => {
  it('kimlikler benzersiz; her coin paketi ekonomi tablosundaki miktarı verir', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    for (const [id, coins] of Object.entries(economy.coinPacks)) {
      expect(getProduct(id)?.coins).toBe(coins);
    }
  });

  it('coin paketleri tüketilir; paketler ve reklamsız kalıcıdır', () => {
    expect(products.filter((p) => p.kind === 'consumable').map((p) => p.id)).toEqual([
      'coins.small',
      'coins.medium',
      'coins.large',
    ]);
    for (const id of ['starter.pack', 'bundle.aurora', 'noads']) expect(getProduct(id)?.kind).toBe('permanent');
  });

  it('coin paketleri küçükten büyüğe sıralı', () => {
    const packs = products.filter((p) => p.kind === 'consumable').map((p) => p.coins);
    expect(packs).toEqual([...packs].sort((a, b) => a - b));
  });

  it('mağaza kimliği öneklidir ve geri çözülür', () => {
    expect(storeId('coins.small')).toBe(`${STORE_PREFIX}coins.small`);
    expect(productForStoreId(storeId('noads'))?.id).toBe('noads');
    expect(productForStoreId('com.baska.uygulama.coins.small')).toBeUndefined();
  });

  it('reklamsız: kendi ürünüyle ya da başlangıç paketiyle', () => {
    expect(hasNoAds([])).toBe(false);
    expect(hasNoAds(['bundle.aurora'])).toBe(false);
    expect(hasNoAds(['noads'])).toBe(true);
    expect(hasNoAds(['starter.pack'])).toBe(true);
  });

  it('pakete özel kostümler var olan bir kalıcı ürüne bağlıdır', () => {
    for (const item of cosmetics.filter((c) => c.exclusive)) {
      expect(getProduct(item.exclusive!)?.kind).toBe('permanent');
    }
    expect(exclusivesOf('starter.pack').map((c) => c.id)).toEqual(['hat.explorer']);
    expect(exclusivesOf('bundle.aurora').map((c) => c.id)).toEqual(['scarf.aurora']);
  });

  it('her ürünün ve kostümün adı iki dilde de var', () => {
    const keys = [
      ...products.flatMap((p) => [p.nameKey, p.bodyKey, ...(p.badgeKey ? [p.badgeKey] : [])]),
      ...cosmetics.map((c) => c.nameKey),
      ...cosmeticSlots.map((s) => s.titleKey),
    ];
    for (const key of keys) {
      expect(tr[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
    }
  });

  it('coinle alınan kostümler 150–3000 coin; pakete özel olanların coin fiyatı yok', () => {
    for (const item of cosmetics) {
      if (item.exclusive) expect(item.price).toBe(0);
      else {
        expect(item.price).toBeGreaterThanOrEqual(150);
        expect(item.price).toBeLessThanOrEqual(3000);
      }
    }
  });
});
