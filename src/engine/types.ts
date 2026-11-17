/**
 * Oyun motorunun tipleri.
 *
 * Motor saf TypeScript'tir: React, React Native ya da tema koduna bağımlı
 * değildir. Arayüz, çözücü, yapay zekâ ve Node scriptleri aynı motoru kullanır.
 *
 * Temel fikir: `GameState` küçük, değişmez (immutable) ve serileştirilebilir bir
 * değerdir. `applyMove(state, move)` yeni bir durum ve olup bitenleri anlatan
 * bir olay listesi döndürür; animasyonlar bu olaylardan oynatılır.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Penguen (atkı) renkleri. Tek oyunculuda renk, penguenin igloosunu belirler. */
export type PenguinColor = 'blue' | 'orange' | 'red' | 'yellow' | 'green' | 'purple';

/** Takım kimliği. Tek oyunculuda yalnızca 0 vardır; düelloda 0 ve 1. */
export type TeamId = number;

/**
 * Zemin tipleri. Igloolar zemin değil, hücrenin üstünde duran ayrı nesnelerdir.
 * - cracked: çatlak buz. Üstünden ayrılan ilk penguenden sonra suya döner.
 */
export type CellType = 'ice' | 'rock' | 'water' | 'cracked';

/**
 * - active: tahtada, oynanabilir.
 * - asleep: tahtada, engel gibi davranır; başka bir penguen çarpınca uyanır.
 * - home: igloosuna girdi, tahtadan çıktı.
 */
export type PenguinStatus = 'active' | 'asleep' | 'home';

export interface Vec {
  readonly x: number;
  readonly y: number;
}

export interface Penguin {
  readonly id: string;
  readonly color: PenguinColor;
  readonly team: TeamId;
  /** Baktığı ve kayacağı yön. `turnOnBump` kuralı açıksa çarpınca değişir. */
  readonly dir: Direction;
  /** Konum. `home` durumundayken girdiği igloonun hücresidir. */
  readonly x: number;
  readonly y: number;
  readonly status: PenguinStatus;
}

export interface Igloo {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Renk eşleşmeli oyunda (tek oyunculu) kabul ettiği renk. */
  readonly color: PenguinColor | null;
  /** Takım eşleşmeli oyunda (düello) sahibi olan takım. */
  readonly team: TeamId | null;
  /** Alabileceği penguen sayısı. null = sınırsız. */
  readonly capacity: number | null;
  /** İçindeki penguen sayısı. */
  readonly occupants: number;
}

export interface Rules {
  /**
   * Bir penguenin hangi igloya girebileceği:
   * - color: aynı renkteki igloo (tek oyunculu).
   * - team: kendi takımının, yeri olan bir igloosu (düello).
   */
  readonly iglooMatch: 'color' | 'team';
  /** Toplam hamle sınırı (iki takımın hamleleri birlikte). null = sınırsız. */
  readonly moveLimit: number | null;
  /**
   * Adalet ayarı: ikinci oyuncu ilk turunda art arda iki hamle yapar.
   * İlk oyuncu avantajı simülasyonlarda yüksek çıkarsa açılır.
   */
  readonly secondPlayerExtraMove: boolean;
  /**
   * "Çarpınca dön" kuralı: penguen bir engele çarpıp durunca saat yönünde
   * 90° döner. Önü kapalı penguene dokunmak da onu yerinde döndürür ve hamle
   * sayılır (kapalıyken bu dokunuş reddedilir). Bu kuralla penguenin nerede
   * durduğu önem kazanır: bir pengueni park edip diğerini ona çarptırmak
   * oyunun asıl stratejisi olur.
   */
  readonly turnOnBump: boolean;
}

export type GameOverReason =
  /** Bir takımın bütün penguenleri yuvada. */
  | 'allHome'
  /** Hamle sınırı doldu; yuvadaki penguen sayısına bakıldı. */
  | 'moveLimit'
  /** Bütün takımlar art arda pas geçti; yuvadaki penguen sayısına bakıldı. */
  | 'noMoves';

export interface GameResult {
  /** Kazanan takım; berabere ise null. */
  readonly winner: TeamId | null;
  readonly reason: GameOverReason;
  /** Takım → yuvadaki penguen sayısı. */
  readonly homeCounts: Readonly<Record<TeamId, number>>;
}

export interface GameState {
  readonly width: number;
  readonly height: number;
  /** Satır satır hücreler: indeks = y * width + x. */
  readonly cells: readonly CellType[];
  readonly penguins: readonly Penguin[];
  readonly igloos: readonly Igloo[];
  /** Oynama sırasına göre takımlar. Tek oyunculuda [0]. */
  readonly teams: readonly TeamId[];
  /** Sırası gelen takım. */
  readonly turn: TeamId;
  /** Kaçıncı turdayız (0'dan başlar; her sıra değişiminde artar). */
  readonly turnNumber: number;
  /** Sıradaki takımın bu turda kalan hamle hakkı (normalde 1). */
  readonly movesLeftInTurn: number;
  /** Yapılan toplam hamle. Paslar ve reddedilen dokunuşlar sayılmaz. */
  readonly moveCount: number;
  /** Art arda geçilen pas sayısı. */
  readonly consecutivePasses: number;
  readonly rules: Rules;
  /** Oyun bittiyse sonuç; sürüyorsa null. */
  readonly result: GameResult | null;
}

/** Oyuncunun yapabildiği tek şey: bir penguene dokunmak. */
export interface Move {
  readonly penguinId: string;
}

/** Bir penguenin kayarken neye çarpıp durduğu. */
export type Obstacle =
  | { readonly kind: 'wall' }
  | { readonly kind: 'rock' }
  | { readonly kind: 'water' }
  | { readonly kind: 'penguin'; readonly penguinId: string }
  | { readonly kind: 'igloo'; readonly iglooId: string };

export type RejectReason =
  /** Oyun bitmiş. */
  | 'gameOver'
  | 'unknownPenguin'
  /** Penguen uyuyor ya da yuvada. */
  | 'notActive'
  /** Sıra bu penguenin takımında değil. */
  | 'notYourTurn'
  /** Penguenin önü kapalı: "hayır" animasyonu. */
  | 'blocked';

/**
 * Bir hamlenin sonucunda olanlar, oluş sırasıyla. Arayüz bunları sırayla
 * canlandırır; motorun kendisi zamanlama bilmez.
 */
export type GameEvent =
  /** Hamle uygulanmadı; durum değişmedi. `blocked` ise engel de bildirilir. */
  | {
      readonly type: 'rejected';
      readonly penguinId: string;
      readonly reason: RejectReason;
      readonly obstacle?: Obstacle;
    }
  /** Penguen `from` hücresinden `to` hücresine kaydı (igloya girdiyse `to` igloo hücresi). */
  | {
      readonly type: 'slide';
      readonly penguinId: string;
      readonly dir: Direction;
      readonly from: Vec;
      readonly to: Vec;
      readonly distance: number;
    }
  /**
   * Çatlak buz kırılıp suya döndü. `step`: penguen kaymanın kaçıncı adımında bu
   * hücreden ayrıldı (0 = başlangıç hücresi) — animasyon zamanlaması için.
   */
  | { readonly type: 'crackBreak'; readonly x: number; readonly y: number; readonly step: number }
  /** Penguen bir engele çarpıp `at` hücresinde durdu. */
  | {
      readonly type: 'bump';
      readonly penguinId: string;
      readonly at: Vec;
      readonly obstacle: Obstacle;
    }
  /** Penguen saat yönünde döndü (çarpma sonrası ya da yerinde). */
  | { readonly type: 'turn'; readonly penguinId: string; readonly from: Direction; readonly to: Direction }
  /** Uyuyan penguen çarpılınca uyandı. */
  | { readonly type: 'wakeUp'; readonly penguinId: string; readonly byPenguinId: string }
  | { readonly type: 'enterIgloo'; readonly penguinId: string; readonly iglooId: string }
  /** Takımın geçerli hamlesi yok; sırası otomatik geçti. */
  | { readonly type: 'pass'; readonly team: TeamId }
  /** Sıra bu takıma geçti. */
  | { readonly type: 'turnChange'; readonly team: TeamId; readonly movesInTurn: number }
  | { readonly type: 'gameOver'; readonly result: GameResult };

export interface MoveOutcome {
  /** Hamle reddedildiyse girdiyle aynı nesne. */
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** Hamle uygulandı mı? (false → tek olay `rejected`.) */
  readonly accepted: boolean;
}
