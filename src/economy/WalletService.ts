/**
 * Cüzdan servisi. Bütün coin işlemleri buradan geçer; ekranlar ve oyun kodu
 * bakiyeyi doğrudan değiştirmez.
 *
 * Veri akışı:
 *   işlem → yerel işlem kaydı (ledger) + yerel cihaz belgesi (MMKV)
 *         → iCloud'daki kendi anahtarımız (`dev.v1.<deviceId>`)
 *   okuma ← bütün cihaz belgelerinin birleşimi → bakiye formülü
 *
 * Kurallar:
 *  - Her işlem idempotenttir: aynı kimlik ikinci kez uygulanmaz.
 *  - Önce yerele yazılır, sonra buluta. Bulut yazımı başarısız olsa da işlem
 *    kaybolmaz; `sync()` ile yeniden gönderilir.
 *  - Bulutta yalnızca kendi anahtarımıza yazarız; başka cihazların anahtarlarına
 *    asla dokunmayız.
 */
import type { LocalStore, WalletBackend } from './backends/WalletBackend';
import { economy, type AchievementId, type CpuDifficulty } from './economy.config';
import { Ledger } from './ledger';
import { mergeDocs, mergeOwnCopies } from './merge';
import { docBytes, parseDoc, serializeDoc, utf8Bytes } from './migrate';
import {
  computeBalance,
  cpuFirstWinKey,
  dailyDuelKey,
  dailyPuzzleKey,
  levelReward,
  loginKey,
  type Balance,
} from './rewards';
import {
  DEVICE_KEY_PREFIX,
  DOC_WARN_BYTES,
  emptyDoc,
  MAX_KEY_BYTES,
  type DeviceDoc,
  type LedgerEntry,
  type LedgerKind,
  type MergedState,
} from './types';

const LOCAL_DOC_KEY = 'wallet.doc.v1';
const REMOTE_CACHE_KEY = 'wallet.remote.v1';

export interface WalletSnapshot {
  balance: Balance;
  state: MergedState;
  /** Bulut deposu kullanılabilir mi (iCloud açık mı)? */
  cloudAvailable: boolean;
  /** Yerelde olup buluta henüz gönderilememiş değişiklik var mı? */
  pendingSync: boolean;
  /** Kendi belgemizin iCloud'da kapladığı bayt ve uyarı eşiğini aşıp aşmadığı. */
  docBytes: number;
  docTooLarge: boolean;
}

export type SpendResult = 'ok' | 'insufficient' | 'duplicate';
export type PurchaseResult = 'applied' | 'duplicate';

export interface WalletOptions {
  deviceId: string;
  backend: WalletBackend;
  local: LocalStore;
  /** Saat (testlerde sabitlenir). */
  now?: () => number;
}

export class WalletService {
  private readonly deviceKey: string;
  private readonly backend: WalletBackend;
  private readonly local: LocalStore;
  private readonly now: () => number;
  private readonly ledger: Ledger;
  private readonly listeners = new Set<() => void>();

  /** Bu cihazın belgesi (yerel kopya esas alınır). */
  private doc: DeviceDoc;
  /** Diğer cihazların belgeleri: anahtar → belge. Çevrimdışıyken son bilinen hâli. */
  private others: Record<string, DeviceDoc> = {};
  private cloudAvailable = false;
  private pendingSync = false;
  private snapshot: WalletSnapshot;
  private unsubscribe: (() => void) | null = null;

  constructor(options: WalletOptions) {
    this.deviceKey = `${DEVICE_KEY_PREFIX}${options.deviceId}`;
    if (utf8Bytes(this.deviceKey) > MAX_KEY_BYTES) {
      throw new Error(`Cihaz anahtarı ${MAX_KEY_BYTES} baytı aşıyor: ${this.deviceKey}`);
    }
    this.backend = options.backend;
    this.local = options.local;
    this.now = options.now ?? Date.now;
    this.ledger = new Ledger(this.local);

    // Yerel veriler senkron okunur: bakiye uygulama açılır açılmaz hazırdır.
    this.doc = parseDoc(this.local.get(LOCAL_DOC_KEY)) ?? emptyDoc(this.now());
    this.others = this.readRemoteCache();
    this.snapshot = this.buildSnapshot();
  }

  // -------------------------------------------------------------------------
  // Yaşam döngüsü ve senkronizasyon
  // -------------------------------------------------------------------------

  /** Uygulama açılışında bir kez: buluttan çek, birleştir, değişiklikleri dinle. */
  async start(): Promise<void> {
    this.unsubscribe ??= this.backend.subscribe(() => {
      void this.sync();
    });
    await this.sync();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /**
   * Buluttan bütün cihaz belgelerini çeker, birleştirir ve kendi belgemizi
   * gönderir. Bulut kullanılamıyorsa yerel veriyle devam eder. Asla hata fırlatmaz.
   */
  async sync(): Promise<void> {
    try {
      this.cloudAvailable = await this.backend.isAvailable();
      if (!this.cloudAvailable) {
        this.refresh();
        return;
      }
      const all = await this.backend.readAll(DEVICE_KEY_PREFIX);
      const others: Record<string, DeviceDoc> = {};
      for (const [key, text] of Object.entries(all)) {
        const doc = parseDoc(text);
        if (!doc) continue;
        if (key === this.deviceKey) {
          // Buluttaki kendi belgemiz: uygulama silinip yeniden yüklendiyse yerel
          // kopya boştur, veriyi buradan geri alırız.
          const restored = mergeOwnCopies(this.doc, doc);
          if (serializeDoc(restored) !== serializeDoc(this.doc)) this.saveLocal(restored);
        } else {
          others[key] = doc;
        }
      }
      this.others = others;
      this.local.set(REMOTE_CACHE_KEY, JSON.stringify(others));

      // Kendi belgemiz buluttakinden farklıysa gönder.
      const mine = serializeDoc(this.doc);
      if (all[this.deviceKey] !== mine) await this.backend.write(this.deviceKey, mine);
      this.pendingSync = false;
    } catch {
      // Ağ ya da depo hatası: yerel veri güvende, sonraki denemede gönderilir.
      this.pendingSync = true;
    }
    this.refresh();
  }

  getSnapshot(): WalletSnapshot {
    return this.snapshot;
  }

  /** Bakiye ya da durum değişince çağrılır. Dönen fonksiyon aboneliği bitirir. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Yerel işlem geçmişi (en yeniden eskiye). */
  history(): readonly LedgerEntry[] {
    return this.ledger.list();
  }

  // -------------------------------------------------------------------------
  // Kazanma
  // -------------------------------------------------------------------------

  /**
   * Bu sonuç kaydedilirse kazanılacak coin (kaydetmeden, senkron). Bölüm sonu
   * ekranı sayacı bulut yazımını beklemeden göstermek için kullanır.
   */
  previewLevelReward(levelId: string, stars: number): number {
    const before = this.snapshot.state.stars[levelId] ?? 0;
    return Math.max(0, levelReward(stars) - levelReward(before));
  }

  /**
   * Bölüm sonucu. Yalnızca o bölümde ilk kez kazanılan yıldızlar ödül verir;
   * aynı bölümü tekrar oynamak coin kazandırmaz. Dönen değer, bu sonuçla
   * kazanılan coin (bölüm sonu ekranındaki sayaç için).
   */
  async recordLevelResult(levelId: string, stars: number): Promise<number> {
    const gained = this.previewLevelReward(levelId, stars);
    if (stars > (this.doc.stars[levelId] ?? 0)) {
      await this.commit(
        { ...this.doc, stars: { ...this.doc.stars, [levelId]: Math.min(3, Math.floor(stars)) } },
        gained > 0 ? this.entry(`level:${levelId}:${stars}`, gained, 'level', levelId) : null,
      );
    }
    return gained;
  }

  /** Günlük bulmaca ödülü. Aynı gün ikinci kez verilmez. `date`: YYYY-MM-DD. */
  claimDailyPuzzle(date: string): Promise<number> {
    return this.claimSetMember('dailyClaims', dailyPuzzleKey(date), economy.dailyPuzzle, 'daily', `daily:${date}`, () =>
      this.snapshot.state.dailyClaims.includes(dailyPuzzleKey(date)),
    );
  }

  /** Günlük giriş ödülü. `day`: 7 günlük döngüdeki gün (1–7). Gün başına tek ödül. */
  claimLogin(date: string, day: number): Promise<number> {
    const index = Math.min(economy.loginStreak.length, Math.max(1, Math.floor(day)));
    return this.claimSetMember(
      'dailyClaims',
      loginKey(date, index),
      economy.loginStreak[index - 1]!,
      'daily',
      `login:${date}`,
      () => this.snapshot.state.dailyClaims.some((c) => c.startsWith(`login:${date}:`)),
    );
  }

  unlockAchievement(id: AchievementId): Promise<number> {
    return this.claimSetMember('achievements', id, economy.achievements[id], 'achievement', id, () =>
      this.snapshot.state.achievements.includes(id),
    );
  }

  /** Bilgisayara karşı bu zorlukta ilk galibiyet. */
  claimCpuFirstWin(difficulty: CpuDifficulty): Promise<number> {
    const key = cpuFirstWinKey(difficulty);
    return this.claimSetMember('duelRewards', key, economy.duel.cpuFirstWin[difficulty], 'duel', key, () =>
      this.snapshot.state.duelRewards.includes(key),
    );
  }

  /** Günün ödüllü düello galibiyeti; günlük sınır dolduysa 0 döner. */
  async claimDailyDuelWin(date: string): Promise<number> {
    for (let n = 1; n <= economy.duel.dailyWinLimit; n++) {
      const key = dailyDuelKey(date, n);
      if (this.snapshot.state.duelRewards.includes(key)) continue;
      return this.claimSetMember('duelRewards', key, economy.duel.dailyWin, 'duel', key, () => false);
    }
    return 0;
  }

  /**
   * Ödüllü video coinleri. `rewardId` aynı ödülün iki kez verilmesini engeller
   * (ör. 'double:12' → 12. bölümün "videoyla 2 katı" ödülü).
   */
  async addAdBonus(rewardId: string, amount: number): Promise<number> {
    const id = `ad:${rewardId}`;
    if (amount <= 0 || this.ledger.has(id)) return 0;
    await this.commit({ ...this.doc, adBonus: this.doc.adBonus + amount }, this.entry(id, amount, 'ad', rewardId));
    return amount;
  }

  // -------------------------------------------------------------------------
  // Satın alma ve iade
  // -------------------------------------------------------------------------

  /**
   * Doğrulanmış bir coin satın alımını işler. Sıra kritiktir:
   *   1. İşlem daha önce (bu ya da başka bir cihazda) işlendiyse dokunma.
   *   2. Önce yerele, sonra buluta yaz.
   *   3. Bu fonksiyon döndükten SONRA çağıran `finishTransaction` yapar.
   * Uygulama arada kapanırsa bitirilmemiş işlem sonraki açılışta yeniden gelir
   * ve burada 'duplicate' olarak tanınır: coin ne kaybolur ne iki kez verilir.
   */
  async addPurchase(transactionId: string, coins: number): Promise<PurchaseResult> {
    if (transactionId in this.snapshot.state.purchases || this.ledger.has(`purchase:${transactionId}`)) {
      return 'duplicate';
    }
    await this.commit(
      { ...this.doc, purchases: { ...this.doc.purchases, [transactionId]: coins } },
      this.entry(`purchase:${transactionId}`, coins, 'purchase', transactionId),
    );
    return 'applied';
  }

  /** İade edilen satın alım: coinleri bakiyeden düşer. Tekrar çağrılırsa etkisizdir. */
  async revokePurchase(transactionId: string): Promise<void> {
    if (this.snapshot.state.revoked.includes(transactionId)) return;
    const coins = this.snapshot.state.purchases[transactionId] ?? 0;
    await this.commit(
      { ...this.doc, revoked: [...this.doc.revoked, transactionId] },
      this.entry(`refund:${transactionId}`, -coins, 'refund', transactionId),
    );
  }

  // -------------------------------------------------------------------------
  // Harcama
  // -------------------------------------------------------------------------

  /**
   * Coin harcar (ipucu, ekstra geri alma). Yerel bakiye yetmiyorsa reddedilir.
   * `spendId` aynı harcamanın iki kez düşülmesini engeller.
   */
  async spend(spendId: string, amount: number, source: string): Promise<SpendResult> {
    const id = `spend:${spendId}`;
    if (this.ledger.has(id)) return 'duplicate';
    if (amount <= 0 || this.snapshot.balance.raw < amount) return 'insufficient';
    await this.commit({ ...this.doc, spent: this.doc.spent + amount }, this.entry(id, -amount, 'spend', source));
    return 'ok';
  }

  /** Coinle kostüm ya da süs açar. Zaten açıksa tekrar ücret alınmaz. */
  async buyCosmetic(itemId: string, price: number): Promise<SpendResult> {
    if (itemId in this.snapshot.state.cosmetics) return 'duplicate';
    if (price < 0 || this.snapshot.balance.raw < price) return 'insufficient';
    await this.commit(
      { ...this.doc, cosmetics: { ...this.doc.cosmetics, [itemId]: price } },
      this.entry(`cosmetic:${itemId}`, -price, 'cosmetic', itemId),
    );
    return 'ok';
  }

  // -------------------------------------------------------------------------
  // Coin dışı ilerleme
  // -------------------------------------------------------------------------

  /** Düello sonucu istatistiği. `matchId` aynı maçın iki kez sayılmasını engeller. */
  async recordDuelResult(matchId: string, result: 'win' | 'draw' | 'loss'): Promise<void> {
    const id = `duelstat:${matchId}`;
    if (this.ledger.has(id)) return;
    const field = result === 'win' ? 'wins' : result === 'draw' ? 'draws' : 'losses';
    await this.commit(
      { ...this.doc, duelStats: { ...this.doc.duelStats, [field]: this.doc.duelStats[field] + 1 } },
      this.entry(id, 0, 'duel', result),
    );
  }

  /** Seçili kostümler ve avatar ayarları. En yeni kayıt bütün cihazlarda geçerli olur. */
  async setEquipped(equipped: Record<string, string>): Promise<void> {
    await this.commit({ ...this.doc, profile: { equipped, updatedAt: this.now() } }, null);
  }

  // -------------------------------------------------------------------------
  // İç işleyiş
  // -------------------------------------------------------------------------

  /** Küme tipindeki ödüller (günlük, başarım, düello) için ortak yol. */
  private async claimSetMember(
    field: 'dailyClaims' | 'achievements' | 'duelRewards',
    member: string,
    reward: number,
    kind: LedgerKind,
    source: string,
    alreadyClaimed: () => boolean,
  ): Promise<number> {
    if (alreadyClaimed()) return 0;
    await this.commit(
      { ...this.doc, [field]: [...this.doc[field], member] },
      this.entry(`${kind}:${member}`, reward, kind, source),
    );
    return reward;
  }

  private entry(id: string, amount: number, kind: LedgerKind, source: string): LedgerEntry {
    return { id, amount, kind, source, createdAt: this.now() };
  }

  /** Değişikliği önce yerele, sonra buluta yazar. */
  private async commit(next: DeviceDoc, entry: LedgerEntry | null): Promise<void> {
    if (entry) this.ledger.add(entry);
    this.saveLocal({ ...next, updatedAt: this.now() });
    this.refresh();
    await this.push();
  }

  private saveLocal(doc: DeviceDoc): void {
    this.doc = doc;
    this.local.set(LOCAL_DOC_KEY, serializeDoc(doc));
  }

  /** Kendi belgemizi buluta gönderir; başarısız olursa sonra yeniden denenir. */
  private async push(): Promise<void> {
    try {
      this.cloudAvailable = await this.backend.isAvailable();
      if (!this.cloudAvailable) {
        this.pendingSync = true;
      } else {
        await this.backend.write(this.deviceKey, serializeDoc(this.doc));
        this.pendingSync = false;
      }
    } catch {
      this.pendingSync = true;
    }
    this.refresh();
  }

  private readRemoteCache(): Record<string, DeviceDoc> {
    const out: Record<string, DeviceDoc> = {};
    try {
      const raw = JSON.parse(this.local.get(REMOTE_CACHE_KEY) ?? '{}') as Record<string, unknown>;
      for (const [key, value] of Object.entries(raw)) {
        const doc = parseDoc(JSON.stringify(value));
        if (doc && key !== this.deviceKey) out[key] = doc;
      }
    } catch {
      // Bozuk önbellek: yok say, sonraki senkronizasyonda yeniden dolar.
    }
    return out;
  }

  private buildSnapshot(): WalletSnapshot {
    const state = mergeDocs([this.doc, ...Object.values(this.others)]);
    const bytes = docBytes(this.doc);
    return {
      balance: computeBalance(state),
      state,
      cloudAvailable: this.cloudAvailable,
      pendingSync: this.pendingSync,
      docBytes: bytes,
      docTooLarge: bytes > DOC_WARN_BYTES,
    };
  }

  private refresh(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}
