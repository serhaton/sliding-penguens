/** Bakiye formülü ve birleştirme: saf fonksiyonlar. */
import { economy } from '../economy.config';
import { mergeDocs, mergeOwnCopies } from '../merge';
import { docBytes, parseDoc, serializeDoc } from '../migrate';
import {
  achievementRewards,
  computeBalance,
  dailyRewards,
  duelRewards,
  levelReward,
  levelRewards,
  purchasedCoins,
} from '../rewards';
import { emptyDoc, SCHEMA_VERSION, type DeviceDoc } from '../types';

const doc = (change: Partial<DeviceDoc> = {}): DeviceDoc => ({ ...emptyDoc(0), ...change });

describe('bölüm ödülleri', () => {
  it('ilk bitirme 10, yıldız başına 5, ilk 3 yıldız +10', () => {
    expect([0, 1, 2, 3].map(levelReward)).toEqual([0, 15, 20, 35]);
  });

  it('yıldız artınca yalnızca fark kazanılır (1★ → 3★ = +20)', () => {
    expect(levelReward(3) - levelReward(1)).toBe(20);
  });

  it('bütün bölümlerin toplamı', () => {
    expect(levelRewards({ '1': 3, '2': 1, '3': 2 })).toBe(35 + 15 + 20);
  });
});

describe('günlük ödüller', () => {
  it('günlük bulmaca 50; aynı gün iki kez sayılmaz', () => {
    expect(dailyRewards(['daily:2026-11-17', 'daily:2026-11-17', 'daily:2026-11-18'])).toBe(100);
  });

  it('giriş serisi tablodan; 7. gün büyük ödül', () => {
    expect(dailyRewards(['login:2026-11-17:1'])).toBe(economy.loginStreak[0]);
    expect(dailyRewards(['login:2026-11-23:7'])).toBe(100);
  });

  it('aynı gün için iki farklı seri günü kaydı varsa tek ödül: büyük olan', () => {
    // İki cihaz çevrimdışıyken seriyi farklı saymış.
    expect(dailyRewards(['login:2026-11-17:1', 'login:2026-11-17:5'])).toBe(economy.loginStreak[4]);
  });

  it('bozuk kayıtları yok sayar', () => {
    expect(dailyRewards(['', 'daily', 'saçma:2026-11-17', 'login:2026-11-17:abc'])).toBe(economy.loginStreak[0]);
  });
});

describe('başarım ve düello ödülleri', () => {
  it('başarımlar tek seferlik; bilinmeyen kimlik 0', () => {
    expect(achievementRewards(['first-igloo', 'first-igloo', 'gelecekten-gelen'])).toBe(20);
  });

  it('bilgisayara karşı her zorlukta ilk galibiyet', () => {
    expect(duelRewards(['cpu-easy-first-win', 'cpu-hard-first-win'])).toBe(30 + 120);
  });

  it('günlük galibiyet ödülü günde en fazla 3 kez', () => {
    const day = (n: number) => `daily-duel-2026-11-17-${n}`;
    expect(duelRewards([day(1), day(2), day(3), day(4), day(1)])).toBe(45);
  });
});

describe('bakiye formülü', () => {
  it('kazanılan + satın alınan − harcanan', () => {
    const state = mergeDocs([
      doc({
        stars: { '1': 3 },
        dailyClaims: ['daily:2026-11-17'],
        achievements: ['first-igloo'],
        duelRewards: ['cpu-easy-first-win'],
        adBonus: 35,
        purchases: { t1: 500, t2: 1500 },
        revoked: ['t2'],
        spent: 60,
        cosmetics: { hat: 200 },
      }),
    ]);
    const balance = computeBalance(state);
    expect(balance.earned).toBe(35 + 50 + 20 + 30 + 35);
    expect(balance.purchased).toBe(500);
    expect(balance.spent).toBe(260);
    expect(balance.raw).toBe(170 + 500 - 260);
    expect(balance.display).toBe(balance.raw);
  });

  it('borç: gerçek bakiye negatif olabilir, ekranda 0 gösterilir', () => {
    const balance = computeBalance(mergeDocs([doc({ stars: { '1': 1 }, spent: 100 })]));
    expect(balance.raw).toBe(-85);
    expect(balance.display).toBe(0);
  });

  it('iade edilen satın alım sayılmaz', () => {
    expect(purchasedCoins({ purchases: { a: 500, b: 100 }, revoked: ['a', 'yok'] })).toBe(100);
  });
});

describe('birleştirme', () => {
  const a = doc({
    stars: { '1': 2, '2': 3 },
    dailyClaims: ['daily:2026-11-17'],
    achievements: ['first-igloo'],
    adBonus: 20,
    spent: 60,
    purchases: { t1: 500 },
    cosmetics: { hat: 200 },
    duelStats: { wins: 2, draws: 0, losses: 1 },
    profile: { equipped: { hat: 'beanie' }, updatedAt: 100 },
  });
  const b = doc({
    stars: { '1': 3, '3': 1 },
    dailyClaims: ['daily:2026-11-17', 'daily:2026-11-18'],
    achievements: ['levels-10'],
    adBonus: 15,
    spent: 30,
    purchases: { t1: 500, t2: 1500 },
    revoked: ['t2'],
    cosmetics: { hat: 200, glasses: 300 },
    duelStats: { wins: 1, draws: 1, losses: 0 },
    profile: { equipped: { hat: 'crown' }, updatedAt: 200 },
  });

  it('yıldızlar: bölüm başına en yüksek', () => {
    expect(mergeDocs([a, b]).stars).toEqual({ '1': 3, '2': 3, '3': 1 });
  });

  it('kümeler: birleşim', () => {
    const m = mergeDocs([a, b]);
    expect(m.dailyClaims).toEqual(['daily:2026-11-17', 'daily:2026-11-18']);
    expect(m.achievements).toEqual(['first-igloo', 'levels-10']);
    expect(m.revoked).toEqual(['t2']);
  });

  it('satın alımlar ve kostümler: kimliğe göre bir kez', () => {
    const m = mergeDocs([a, b]);
    expect(m.purchases).toEqual({ t1: 500, t2: 1500 });
    expect(m.cosmetics).toEqual({ hat: 200, glasses: 300 });
  });

  it('sayaçlar: bütün cihazların toplamı', () => {
    const m = mergeDocs([a, b]);
    expect(m.adBonus).toBe(35);
    expect(m.spent).toBe(90);
    expect(m.duelStats).toEqual({ wins: 3, draws: 1, losses: 1 });
  });

  it('profil: en yeni kazanır', () => {
    expect(mergeDocs([a, b]).profile.equipped).toEqual({ hat: 'crown' });
    expect(mergeDocs([b, a]).profile.equipped).toEqual({ hat: 'crown' });
  });

  it('sıradan bağımsız', () => {
    const c = doc({ stars: { '9': 2 }, adBonus: 5, profile: { equipped: {}, updatedAt: 200 } });
    expect(mergeDocs([a, b, c])).toEqual(mergeDocs([c, a, b]));
    expect(mergeDocs([a, b, c])).toEqual(mergeDocs([b, c, a]));
  });

  it('boş listede boş durum', () => {
    expect(computeBalance(mergeDocs([])).raw).toBe(0);
  });

  it('aynı cihazın iki kopyası: sayaçlar toplanmaz, büyüğü alınır', () => {
    const local = doc({ adBonus: 20, spent: 60, stars: { '1': 2 } });
    const remote = doc({ adBonus: 35, spent: 30, stars: { '1': 1, '2': 3 } });
    const merged = mergeOwnCopies(local, remote);
    expect(merged).toMatchObject({ adBonus: 35, spent: 60, stars: { '1': 2, '2': 3 } });
  });
});

describe('şema: okuma ve sürüm yükseltme', () => {
  it('yazıp okuyunca aynı belge', () => {
    const d = doc({ stars: { '1': 3 }, purchases: { t: 500 }, cosmetics: { hat: 200 } });
    expect(parseDoc(serializeDoc(d))).toEqual(d);
  });

  it('eski sürüm (v0): eksik alanlar doldurulur, kostüm listesi haritaya çevrilir', () => {
    const v0 = JSON.stringify({ stars: { '1': 2 }, spent: 200, cosmetics: ['hat', 'glasses'] });
    const d = parseDoc(v0)!;
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.stars).toEqual({ '1': 2 });
    // Bedel eski sürümde `spent` içindeydi: haritada 0 yazılır, çift düşülmez.
    expect(d.cosmetics).toEqual({ hat: 0, glasses: 0 });
    expect(d.dailyClaims).toEqual([]);
    expect(d.duelStats).toEqual({ wins: 0, draws: 0, losses: 0 });
    expect(computeBalance(mergeDocs([d])).spent).toBe(200);
  });

  it('daha yeni sürüm: tanınan alanlar okunur, bilinmeyenler yok sayılır, sürüm düşürülmez', () => {
    const future = JSON.stringify({ schemaVersion: 7, stars: { '1': 3 }, yeniAlan: { x: 1 } });
    const d = parseDoc(future)!;
    expect(d.schemaVersion).toBe(7);
    expect(d.stars).toEqual({ '1': 3 });
    expect('yeniAlan' in d).toBe(false);
  });

  it('bozuk alanlar boş sayılır, belgenin gerisi kurtarılır', () => {
    const d = parseDoc(
      JSON.stringify({
        stars: { '1': 9, '2': 'üç', '3': -1 },
        dailyClaims: 'liste değil',
        achievements: ['first-igloo', 5, null],
        adBonus: -50,
        spent: 'çok',
        purchases: { t1: 500, t2: 'x' },
        duelStats: null,
      }),
    )!;
    expect(d.stars).toEqual({ '1': 3 });
    expect(d.dailyClaims).toEqual([]);
    expect(d.achievements).toEqual(['first-igloo']);
    expect(d.adBonus).toBe(0);
    expect(d.spent).toBe(0);
    expect(d.purchases).toEqual({ t1: 500 });
  });

  it('okunamayan metin için null; asla hata fırlatmaz', () => {
    expect(parseDoc('json değil')).toBeNull();
    expect(parseDoc('[1,2]')).toBeNull();
    expect(parseDoc('')).toBeNull();
    expect(parseDoc(null)).toBeNull();
  });

  it('boyut: 90 bölüm + bir yıllık günlük kayıtla belge 20 KB altında', () => {
    const big = doc({
      stars: Object.fromEntries(Array.from({ length: 90 }, (_, i) => [String(i + 1), 3])),
      dailyClaims: Array.from({ length: 365 }, (_, i) => [`daily:2026-${i}`, `login:2026-${i}:7`]).flat(),
      achievements: Object.keys(economy.achievements),
      purchases: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`200000${i}123456`, 1500])),
    });
    expect(docBytes(big)).toBeLessThan(20 * 1024);
  });

  it('bayt sayımı Türkçe karakterleri doğru sayar', () => {
    expect(docBytes(doc())).toBe(serializeDoc(doc()).length);
    const withTr = doc({ profile: { equipped: { şapka: 'ğ' }, updatedAt: 0 } });
    expect(docBytes(withTr)).toBe(serializeDoc(withTr).length + 2);
  });
});
