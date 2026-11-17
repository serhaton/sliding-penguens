/**
 * Ekonomi veri tipleri.
 *
 * Kalıcı kaynak iCloud anahtar-değer deposudur ve her cihaz YALNIZCA kendi
 * anahtarına (`dev.v1.<deviceId>`) yazar: aynı anahtara iki cihaz yazsa sonuncu
 * kazanır ve veri kaybolurdu. Bütün cihaz belgeleri okunup birleştirilir
 * (merge.ts) ve bakiye her seferinde birleşik veriden yeniden hesaplanır
 * (rewards.ts). Böylece aynı ödül iki cihazda kazanılsa da bir kez verilir.
 */

export const SCHEMA_VERSION = 1;

/** Cihaz anahtarı öneki. iCloud anahtarı en fazla 64 bayt olabilir. */
export const DEVICE_KEY_PREFIX = 'dev.v1.';
export const MAX_KEY_BYTES = 64;
/** iCloud anahtar-değer deposunun toplam sınırı. */
export const MAX_TOTAL_BYTES = 1024 * 1024;
/** Cihaz belgesi bu boyutu geçerse uyarı verilir (sınıra daha çok var). */
export const DOC_WARN_BYTES = 200 * 1024;

export interface DuelStats {
  wins: number;
  draws: number;
  losses: number;
}

export interface Profile {
  /** Seçili kostümler ve avatar ayarları (yuva → ürün kimliği). */
  equipped: Record<string, string>;
  /** En yeni olan kazanır. */
  updatedAt: number;
}

/** Bir cihazın iCloud'a yazdığı belge. Kompakt tutulur. */
export interface DeviceDoc {
  schemaVersion: number;
  updatedAt: number;
  /** Bölüm kimliği → bu cihazda kazanılan en yüksek yıldız. */
  stars: Record<string, number>;
  /**
   * Ödülü alınmış günlük kayıtlar:
   *   'daily:2026-11-17'    günlük bulmaca
   *   'login:2026-11-17:3'  giriş serisi, döngünün 3. günü
   */
  dailyClaims: string[];
  achievements: string[];
  /** Ödülü alınmış düello kimlikleri: 'cpu-hard-first-win', 'daily-duel-2026-11-17-1'. */
  duelRewards: string[];
  /** Ödüllü videolardan kazanılan coin toplamı. Yalnızca artar. */
  adBonus: number;
  /** İşlenmiş satın alımlar: transactionId → coin. */
  purchases: Record<string, number>;
  /** İade edilen satın alımların transactionId'leri. */
  revoked: string[];
  /** Tüketilen şeylere (ipucu, geri alma) harcanan coin toplamı. Yalnızca artar. */
  spent: number;
  /**
   * Coinle açılmış kostüm ve süsler: ürün kimliği → ödenen coin.
   * Liste yerine harita: iki cihaz çevrimdışıyken aynı ürünü alırsa birleşimde
   * tek ürün ve tek ödeme kalır (sayaçta tutulsaydı iki kez düşerdi).
   */
  cosmetics: Record<string, number>;
  duelStats: DuelStats;
  profile: Profile;
}

/** Bütün cihaz belgelerinin birleşimi. */
export interface MergedState {
  stars: Record<string, number>;
  dailyClaims: string[];
  achievements: string[];
  duelRewards: string[];
  adBonus: number;
  purchases: Record<string, number>;
  revoked: string[];
  spent: number;
  cosmetics: Record<string, number>;
  duelStats: DuelStats;
  profile: Profile;
}

export type LedgerKind =
  | 'level'
  | 'daily'
  | 'achievement'
  | 'duel'
  | 'ad'
  | 'purchase'
  | 'refund'
  | 'spend'
  | 'cosmetic';

/**
 * Yerel işlem kaydı: geçmiş ve hata ayıklama için. iCloud'a gönderilmez.
 * `id` aynı zamanda tekrar korumasıdır: aynı kimlik ikinci kez uygulanmaz.
 */
export interface LedgerEntry {
  id: string;
  /** Kazanç artı, harcama eksi. */
  amount: number;
  kind: LedgerKind;
  source: string;
  createdAt: number;
}

export function emptyDoc(now: number): DeviceDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
    stars: {},
    dailyClaims: [],
    achievements: [],
    duelRewards: [],
    adBonus: 0,
    purchases: {},
    revoked: [],
    spent: 0,
    cosmetics: {},
    duelStats: { wins: 0, draws: 0, losses: 0 },
    profile: { equipped: {}, updatedAt: 0 },
  };
}
