/**
 * Cüzdan senaryoları: tek hesap, birden çok cihaz, çevrimdışı çalışma.
 * "Coinler asla kaybolmamalı ve iki kez verilmemeli."
 */
import { MemoryCloud, MemoryLocalStore, MemoryWalletBackend } from '../backends/MemoryWalletBackend';
import { economy } from '../economy.config';
import { WalletService } from '../WalletService';

interface Device {
  wallet: WalletService;
  backend: MemoryWalletBackend;
  local: MemoryLocalStore;
}

let clock = 1000;
const tick = () => ++clock;

function device(cloud: MemoryCloud, deviceId: string, local = new MemoryLocalStore()): Device {
  const backend = new MemoryWalletBackend(cloud);
  return { wallet: new WalletService({ deviceId, backend, local, now: tick }), backend, local };
}

const balance = (d: Device) => d.wallet.getSnapshot().balance.raw;
/** Bildirimle tetiklenen senkronizasyonların bitmesini bekle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function twoDevices() {
  const cloud = new MemoryCloud();
  const a = device(cloud, 'phone');
  const b = device(cloud, 'ipad');
  await a.wallet.start();
  await b.wallet.start();
  return { cloud, a, b };
}

describe('tekrar koruması (idempotency)', () => {
  it('aynı bölüm sonucu ikinci kez coin vermez', async () => {
    const { a } = await twoDevices();
    expect(await a.wallet.recordLevelResult('1', 3)).toBe(35);
    expect(await a.wallet.recordLevelResult('1', 3)).toBe(0);
    expect(await a.wallet.recordLevelResult('1', 2)).toBe(0);
    expect(balance(a)).toBe(35);
  });

  it('aynı bölümü tekrar oynayarak yalnızca eksik yıldızlar kazanılır', async () => {
    const { a } = await twoDevices();
    expect(await a.wallet.recordLevelResult('1', 1)).toBe(15);
    expect(await a.wallet.recordLevelResult('1', 3)).toBe(20);
    expect(balance(a)).toBe(35);
  });

  it('aynı ödüllü video ödülü iki kez eklenmez', async () => {
    const { a } = await twoDevices();
    expect(await a.wallet.addAdBonus('double:1', 35)).toBe(35);
    expect(await a.wallet.addAdBonus('double:1', 35)).toBe(0);
    expect(balance(a)).toBe(35);
  });

  it('aynı harcama iki kez düşülmez', async () => {
    const { a } = await twoDevices();
    await a.wallet.addPurchase('t1', 500);
    expect(await a.wallet.spend('hint:7:1', 60, 'hint')).toBe('ok');
    expect(await a.wallet.spend('hint:7:1', 60, 'hint')).toBe('duplicate');
    expect(balance(a)).toBe(440);
  });

  it('günlük, başarım ve düello ödülleri bir kez verilir', async () => {
    const { a } = await twoDevices();
    expect(await a.wallet.claimDailyPuzzle('2026-11-17')).toBe(50);
    expect(await a.wallet.claimDailyPuzzle('2026-11-17')).toBe(0);
    expect(await a.wallet.claimLogin('2026-11-17', 2)).toBe(economy.loginStreak[1]);
    expect(await a.wallet.claimLogin('2026-11-17', 3)).toBe(0);
    expect(await a.wallet.unlockAchievement('first-igloo')).toBe(20);
    expect(await a.wallet.unlockAchievement('first-igloo')).toBe(0);
    expect(await a.wallet.claimCpuFirstWin('hard')).toBe(120);
    expect(await a.wallet.claimCpuFirstWin('hard')).toBe(0);
    expect(balance(a)).toBe(50 + 15 + 20 + 120);
  });

  it('günlük düello ödülü günde üç kez, dördüncüde 0', async () => {
    const { a } = await twoDevices();
    const wins = [];
    for (let i = 0; i < 4; i++) wins.push(await a.wallet.claimDailyDuelWin('2026-11-17'));
    expect(wins).toEqual([15, 15, 15, 0]);
    expect(await a.wallet.claimDailyDuelWin('2026-11-18')).toBe(15);
  });

  it('işlem geçmişi yerelde tutulur', async () => {
    const { a } = await twoDevices();
    await a.wallet.recordLevelResult('1', 3);
    await a.wallet.addPurchase('t1', 500);
    await a.wallet.spend('s1', 60, 'hint');
    expect(a.wallet.history().map((e) => [e.kind, e.amount])).toEqual([
      ['spend', -60],
      ['purchase', 500],
      ['level', 35],
    ]);
  });
});

describe('iki cihaz', () => {
  it('aynı bölüm iki cihazda bitirilirse coin bir kez verilir', async () => {
    const { a, b } = await twoDevices();
    a.backend.online = false;
    b.backend.online = false;
    await a.wallet.recordLevelResult('1', 3);
    await b.wallet.recordLevelResult('1', 3);
    expect(balance(a)).toBe(35);
    expect(balance(b)).toBe(35);

    a.backend.online = true;
    b.backend.online = true;
    await a.wallet.sync();
    await b.wallet.sync();
    await a.wallet.sync();
    expect(balance(a)).toBe(35);
    expect(balance(b)).toBe(35);
  });

  it('farklı yıldızlarla bitirilirse en yükseği geçerli olur', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.recordLevelResult('1', 1);
    await settle();
    // b, a'nın 1 yıldızını görüyor: 3 yıldız yalnızca farkı kazandırır.
    expect(await b.wallet.recordLevelResult('1', 3)).toBe(20);
    await settle();
    expect(balance(a)).toBe(35);
    expect(balance(b)).toBe(35);
  });

  it('bir cihazdaki kazanç diğerine bildirimle yansır', async () => {
    const { a, b } = await twoDevices();
    let notified = 0;
    b.wallet.subscribe(() => notified++);
    await a.wallet.recordLevelResult('5', 2);
    await settle();
    expect(balance(b)).toBe(20);
    expect(notified).toBeGreaterThan(0);
  });

  it('aynı satın alım iki cihazda görünürse coin bir kez eklenir', async () => {
    const { a, b } = await twoDevices();
    a.backend.online = false;
    b.backend.online = false;
    // StoreKit aynı işlemi iki cihaza da teslim etti.
    expect(await a.wallet.addPurchase('tx-100', 500)).toBe('applied');
    expect(await b.wallet.addPurchase('tx-100', 500)).toBe('applied');

    a.backend.online = true;
    b.backend.online = true;
    await a.wallet.sync();
    await b.wallet.sync();
    await a.wallet.sync();
    expect(balance(a)).toBe(500);
    expect(balance(b)).toBe(500);
  });

  it('başka cihazda işlenmiş satın alım tanınır ve yeniden uygulanmaz', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.addPurchase('tx-100', 500);
    await settle();
    expect(await b.wallet.addPurchase('tx-100', 500)).toBe('duplicate');
    expect(balance(b)).toBe(500);
  });

  it('çevrimdışı çift harcama: bakiye eksiye düşer, 0 gösterilir, borç sonraki kazançla kapanır', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.addPurchase('tx-1', 100);
    await settle();
    expect(balance(b)).toBe(100);

    a.backend.online = false;
    b.backend.online = false;
    expect(await a.wallet.spend('a-hint', 100, 'hint')).toBe('ok');
    expect(await b.wallet.spend('b-hint', 100, 'hint')).toBe('ok');

    a.backend.online = true;
    b.backend.online = true;
    await a.wallet.sync();
    await b.wallet.sync();
    await a.wallet.sync();
    expect(a.wallet.getSnapshot().balance).toMatchObject({ raw: -100, display: 0 });
    // Borçluyken harcama reddedilir.
    expect(await a.wallet.spend('a-hint-2', 10, 'hint')).toBe('insufficient');

    // 3 bölüm × 35 = 105 coin: borç kapanır, 5 kalır.
    for (const id of ['1', '2', '3']) await a.wallet.recordLevelResult(id, 3);
    expect(a.wallet.getSnapshot().balance).toMatchObject({ raw: 5, display: 5 });
  });

  it('çevrimdışıyken iki cihaz aynı kostümü alırsa tek ödeme kalır', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.addPurchase('tx-1', 500);
    await settle();
    a.backend.online = false;
    b.backend.online = false;
    expect(await a.wallet.buyCosmetic('beanie', 200)).toBe('ok');
    expect(await b.wallet.buyCosmetic('beanie', 200)).toBe('ok');
    a.backend.online = true;
    b.backend.online = true;
    await a.wallet.sync();
    await b.wallet.sync();
    await a.wallet.sync();
    expect(balance(a)).toBe(300);
    expect(await a.wallet.buyCosmetic('beanie', 200)).toBe('duplicate');
  });

  it('düello istatistikleri cihazlar arasında toplanır; profilde en yeni geçerli', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.recordDuelResult('m1', 'win');
    await a.wallet.recordDuelResult('m1', 'win');
    await b.wallet.recordDuelResult('m2', 'loss');
    await a.wallet.setEquipped({ hat: 'beanie' });
    await b.wallet.setEquipped({ hat: 'crown' });
    await settle();
    expect(a.wallet.getSnapshot().state.duelStats).toEqual({ wins: 1, draws: 0, losses: 1 });
    expect(a.wallet.getSnapshot().state.profile.equipped).toEqual({ hat: 'crown' });
  });

  it('her cihaz yalnızca kendi anahtarına yazar', async () => {
    const { cloud, a, b } = await twoDevices();
    await a.wallet.recordLevelResult('1', 3);
    await b.wallet.recordLevelResult('2', 3);
    await settle();
    expect([...cloud.data.keys()].sort()).toEqual(['dev.v1.ipad', 'dev.v1.phone']);
    expect(JSON.parse(cloud.data.get('dev.v1.phone')!).stars).toEqual({ '1': 3 });
    expect(JSON.parse(cloud.data.get('dev.v1.ipad')!).stars).toEqual({ '2': 3 });
  });
});

describe('harcama', () => {
  it('yetersiz bakiyede reddedilir, hiçbir şey değişmez', async () => {
    const { a } = await twoDevices();
    await a.wallet.recordLevelResult('1', 3);
    expect(await a.wallet.spend('hint', 60, 'hint')).toBe('insufficient');
    expect(balance(a)).toBe(35);
    expect(a.wallet.history()).toHaveLength(1);
  });

  it('kostüm: yetersiz bakiyede reddedilir, yeterliyse açılır', async () => {
    const { a } = await twoDevices();
    expect(await a.wallet.buyCosmetic('beanie', 200)).toBe('insufficient');
    await a.wallet.addPurchase('tx-1', 500);
    expect(await a.wallet.buyCosmetic('beanie', 200)).toBe('ok');
    expect(a.wallet.getSnapshot().state.cosmetics).toEqual({ beanie: 200 });
    expect(balance(a)).toBe(300);
  });
});

describe('iade', () => {
  it('iade edilen coin paketi bakiyeden düşer; iki kez iade etkisizdir', async () => {
    const { a, b } = await twoDevices();
    await a.wallet.addPurchase('tx-1', 500);
    await a.wallet.addPurchase('tx-2', 1500);
    await a.wallet.revokePurchase('tx-2');
    await a.wallet.revokePurchase('tx-2');
    await settle();
    expect(balance(a)).toBe(500);
    expect(balance(b)).toBe(500);
    expect(a.wallet.getSnapshot().state.revoked).toEqual(['tx-2']);
  });

  it('coinler harcandıktan sonra iade gelirse bakiye borca düşer', async () => {
    const { a } = await twoDevices();
    await a.wallet.addPurchase('tx-1', 500);
    await a.wallet.spend('s1', 400, 'hint');
    await a.wallet.revokePurchase('tx-1');
    expect(a.wallet.getSnapshot().balance).toMatchObject({ raw: -400, display: 0 });
  });

  it('iade edilmiş işlem yeniden gelirse coin geri verilmez', async () => {
    const { a } = await twoDevices();
    await a.wallet.addPurchase('tx-1', 500);
    await a.wallet.revokePurchase('tx-1');
    expect(await a.wallet.addPurchase('tx-1', 500)).toBe('duplicate');
    expect(balance(a)).toBe(0);
  });
});

describe('satın alma akışı: uygulama arada kapanırsa', () => {
  it('bitirilmemiş işlem yeniden gelince coin ne kaybolur ne iki kez verilir', async () => {
    const cloud = new MemoryCloud();
    const local = new MemoryLocalStore();
    const first = device(cloud, 'phone', local);
    await first.wallet.start();
    // Coin yazıldı ama finishTransaction çağrılamadan uygulama kapandı.
    expect(await first.wallet.addPurchase('tx-9', 1500)).toBe('applied');

    // Sonraki açılış: aynı yerel depo, StoreKit işlemi yeniden teslim ediyor.
    const second = device(cloud, 'phone', local);
    await second.wallet.start();
    expect(await second.wallet.addPurchase('tx-9', 1500)).toBe('duplicate');
    expect(balance(second)).toBe(1500);
  });

  it('bulut yazımı başarısız olsa da coin yerelde durur ve sonra gönderilir', async () => {
    const cloud = new MemoryCloud();
    const a = device(cloud, 'phone');
    await a.wallet.start();
    a.backend.online = false;
    await a.wallet.addPurchase('tx-1', 500);
    expect(balance(a)).toBe(500);
    expect(a.wallet.getSnapshot().pendingSync).toBe(true);
    expect(cloud.data.has('dev.v1.phone') && JSON.parse(cloud.data.get('dev.v1.phone')!).purchases['tx-1']).toBeFalsy();

    a.backend.online = true;
    await a.wallet.sync();
    expect(a.wallet.getSnapshot().pendingSync).toBe(false);
    expect(JSON.parse(cloud.data.get('dev.v1.phone')!).purchases).toEqual({ 'tx-1': 500 });
  });
});

describe('silip yeniden yükleme', () => {
  it('aynı cihaz kimliğiyle (Keychain) her şey iCloud\'dan geri gelir', async () => {
    const cloud = new MemoryCloud();
    const before = device(cloud, 'phone');
    await before.wallet.start();
    await before.wallet.recordLevelResult('1', 3);
    await before.wallet.addPurchase('tx-1', 500);
    await before.wallet.spend('s1', 60, 'hint');
    await before.wallet.addAdBonus('double:1', 35);
    await before.wallet.buyCosmetic('beanie', 200);
    const expected = balance(before);
    expect(expected).toBe(35 + 500 - 60 + 35 - 200);

    // Uygulama silindi: yerel depo boş. Cihaz kimliği Keychain'den aynı geliyor.
    const after = device(cloud, 'phone');
    expect(balance(after)).toBe(0);
    await after.wallet.start();
    expect(balance(after)).toBe(expected);
    expect(after.wallet.getSnapshot().state.cosmetics).toEqual({ beanie: 200 });

    // Geri gelen sayaçların üstüne devam edilir; eski harcama silinmez.
    await after.wallet.spend('s2', 40, 'hint');
    await after.wallet.sync();
    expect(JSON.parse(cloud.data.get('dev.v1.phone')!).spent).toBe(100);
  });

  it('yeni bir cihaz kimliğiyle de (Keychain silinmişse) bakiye korunur; eski anahtar durur', async () => {
    const cloud = new MemoryCloud();
    const old = device(cloud, 'old-id');
    await old.wallet.start();
    await old.wallet.addPurchase('tx-1', 500);
    await old.wallet.spend('s1', 60, 'hint');

    const fresh = device(cloud, 'new-id');
    await fresh.wallet.start();
    expect(balance(fresh)).toBe(440);
    await fresh.wallet.recordLevelResult('1', 3);
    await fresh.wallet.sync();
    expect([...cloud.data.keys()].sort()).toEqual(['dev.v1.new-id', 'dev.v1.old-id']);
    expect(balance(fresh)).toBe(475);
  });
});

describe('iCloud kapalıyken', () => {
  it('her şey yerelde çalışır; açılınca birleştirilir', async () => {
    const cloud = new MemoryCloud();
    const a = device(cloud, 'phone');
    a.backend.online = false;
    await a.wallet.start();
    expect(a.wallet.getSnapshot().cloudAvailable).toBe(false);

    await a.wallet.recordLevelResult('1', 3);
    await a.wallet.addPurchase('tx-1', 500);
    expect(await a.wallet.spend('s1', 60, 'hint')).toBe('ok');
    expect(balance(a)).toBe(475);
    expect(cloud.data.size).toBe(0);

    // Bu sırada başka bir cihaz aynı hesapta oynamış.
    const b = device(cloud, 'ipad');
    await b.wallet.start();
    await b.wallet.recordLevelResult('2', 3);

    a.backend.online = true;
    await a.wallet.sync();
    expect(a.wallet.getSnapshot().cloudAvailable).toBe(true);
    expect(balance(a)).toBe(475 + 35);
  });

  it('yerel veri uygulama yeniden açılınca korunur', async () => {
    const cloud = new MemoryCloud();
    const local = new MemoryLocalStore();
    const first = device(cloud, 'phone', local);
    first.backend.online = false;
    await first.wallet.start();
    await first.wallet.recordLevelResult('1', 3);

    const second = device(cloud, 'phone', local);
    second.backend.online = false;
    // Bakiye, start() beklenmeden, yerel veriden hemen hazır.
    expect(balance(second)).toBe(35);
  });

  it('çevrimdışıyken diğer cihazların son bilinen verisi kullanılır', async () => {
    const cloud = new MemoryCloud();
    const local = new MemoryLocalStore();
    const other = device(cloud, 'ipad');
    await other.wallet.start();
    await other.wallet.addPurchase('tx-1', 500);

    const first = device(cloud, 'phone', local);
    await first.wallet.start();
    expect(balance(first)).toBe(500);

    // Yeniden açılış, bu kez ağ yok: iPad'in coinleri önbellekten görünür.
    const second = device(cloud, 'phone', local);
    second.backend.online = false;
    await second.wallet.start();
    expect(balance(second)).toBe(500);
  });
});

describe('sağlamlık', () => {
  it('buluttaki bozuk belge birleştirmeyi bozmaz', async () => {
    const cloud = new MemoryCloud();
    cloud.data.set('dev.v1.broken', '{bozuk json');
    cloud.data.set('dev.v1.weird', JSON.stringify({ stars: 'yok', spent: -5 }));
    cloud.data.set('başka.anahtar', 'ilgisiz');
    const a = device(cloud, 'phone');
    await a.wallet.start();
    await a.wallet.recordLevelResult('1', 3);
    expect(balance(a)).toBe(35);
  });

  it('eski şemadaki bir cihazın belgesi birleştirmeye katılır', async () => {
    const cloud = new MemoryCloud();
    cloud.data.set('dev.v1.old', JSON.stringify({ stars: { '1': 3 }, spent: 200, cosmetics: ['beanie'] }));
    const a = device(cloud, 'phone');
    await a.wallet.start();
    expect(balance(a)).toBe(35 - 200);
    expect(await a.wallet.buyCosmetic('beanie', 200)).toBe('duplicate');
    // Eski cihazın anahtarına dokunulmaz.
    expect(JSON.parse(cloud.data.get('dev.v1.old')!).cosmetics).toEqual(['beanie']);
  });

  it('64 baytı aşan cihaz anahtarı reddedilir', () => {
    expect(() => device(new MemoryCloud(), 'x'.repeat(60))).toThrow(/64/);
  });

  it('belge boyutu izlenir', async () => {
    const { a } = await twoDevices();
    await a.wallet.recordLevelResult('1', 3);
    const snapshot = a.wallet.getSnapshot();
    expect(snapshot.docBytes).toBeGreaterThan(100);
    expect(snapshot.docTooLarge).toBe(false);
  });
});
