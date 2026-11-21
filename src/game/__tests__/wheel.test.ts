import { cosmetics } from '@/data/cosmetics';
import { economy } from '@/economy/economy.config';
import { dailyRewards, wheelKey, WHEEL_ITEM_FALLBACK } from '@/economy/rewards';

import { pickSegment, pickWheelCosmetic, wheelStatus, WHEEL_SEGMENTS } from '../wheel';

const DAY = '2026-11-21';

describe('çark dilimleri', () => {
  it('ağırlıkların toplamı 100, kimlikler benzersiz', () => {
    expect(WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0)).toBe(100);
    expect(new Set(WHEEL_SEGMENTS.map((s) => s.id)).size).toBe(WHEEL_SEGMENTS.length);
  });

  it('kostüm ve büyük ödüller seyrek çıkar', () => {
    const weight = (id: string) => WHEEL_SEGMENTS.find((s) => s.id === id)!.weight;
    expect(weight('item')).toBeLessThanOrEqual(3);
    expect(weight('c500')).toBeLessThanOrEqual(2);
    // Çevirme başına ortalama coin küçük kalır (günlük bulmacanın ödülünden az).
    const mean = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.coins * s.weight, 0) / 100;
    expect(mean).toBeLessThan(economy.dailyPuzzle);
  });

  it('seçim ağırlıklara uyar', () => {
    const counts: Record<string, number> = {};
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const id = pickSegment((i + 0.5) / N).id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    // Kayan nokta yüzünden sınırdaki tek bir örnek komşu dilime düşebilir.
    for (const segment of WHEEL_SEGMENTS) {
      expect(Math.abs((counts[segment.id] ?? 0) - (segment.weight / 100) * N)).toBeLessThanOrEqual(1);
    }
  });

  it('sınır değerlerinde de bir dilim döner', () => {
    expect(pickSegment(0).id).toBe(WHEEL_SEGMENTS[0]!.id);
    expect(pickSegment(1).id).toBe(WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1]!.id);
    expect(pickSegment(-3)).toBeDefined();
  });
});

describe('çarktan çıkan kostüm', () => {
  it('pakete özel ya da zaten sahip olunan kostüm çıkmaz', () => {
    const owned = new Set(['hat.beanie']);
    for (let i = 0; i < 50; i++) {
      const item = pickWheelCosmetic(owned, i / 50)!;
      expect(item.exclusive).toBeUndefined();
      expect(owned.has(item.id)).toBe(false);
    }
  });

  it('hepsine sahipse null döner', () => {
    const all = new Set(cosmetics.filter((c) => !c.exclusive).map((c) => c.id));
    expect(pickWheelCosmetic(all, 0.4)).toBeNull();
  });
});

describe('çark durumu', () => {
  it('gün başında karşılıksız çevirme hazırdır', () => {
    expect(wheelStatus([], DAY)).toMatchObject({ freeAvailable: true, retryAvailable: false, nextSpin: 1, spins: [] });
  });

  it('ilk çevirmeden sonra videoyla bir hak kalır, sonra biter', () => {
    const one = [wheelKey(DAY, 1, 'c50')];
    expect(wheelStatus(one, DAY)).toMatchObject({ freeAvailable: false, retryAvailable: true, nextSpin: 2 });
    const two = [...one, wheelKey(DAY, 2, 'c10')];
    expect(wheelStatus(two, DAY)).toMatchObject({ freeAvailable: false, retryAvailable: false, nextSpin: null });
    expect(wheelStatus(two, DAY).spins.map((s) => s.coins)).toEqual([50, 10]);
  });

  it('başka günün kayıtları sayılmaz', () => {
    expect(wheelStatus([wheelKey('2026-11-20', 1, 'c50'), 'daily:2026-11-21'], DAY).nextSpin).toBe(1);
  });

  it('kostüm yerine verilen coin, kostüm diliminde görünür', () => {
    const status = wheelStatus([wheelKey(DAY, 1, WHEEL_ITEM_FALLBACK)], DAY);
    expect(status.spins[0]).toEqual({ spin: 1, segmentId: 'item', coins: economy.wheel.itemFallback });
  });
});

describe('çark coinleri bakiyede', () => {
  it('çevirme başına tek ödül sayılır, büyük olanı', () => {
    const claims = [wheelKey(DAY, 1, 'c10'), wheelKey(DAY, 1, 'c100'), wheelKey(DAY, 2, 'c20')];
    expect(dailyRewards(claims)).toBe(120);
  });

  it('kostüm 0 coin, geçersiz çevirme numarası ve bilinmeyen ödül sayılmaz', () => {
    expect(dailyRewards([wheelKey(DAY, 1, 'item'), wheelKey(DAY, 3, 'c500'), wheelKey(DAY, 2, 'c9999')])).toBe(0);
  });

  it('günlük bulmaca ve giriş ödülleriyle toplanır', () => {
    expect(dailyRewards([`daily:${DAY}`, wheelKey(DAY, 1, 'c30')])).toBe(economy.dailyPuzzle + 30);
  });
});
